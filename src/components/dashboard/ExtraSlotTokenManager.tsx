import React, { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock3, Plus, RefreshCcw, XCircle } from "lucide-react";

type Toast = (message: string, type: "success" | "error") => void;

interface ExtraSlotTokenManagerProps {
  token: string;
  branchId: number | null;
  addToast: Toast;
}

interface SlotOption {
  id: number;
  fk_branch_id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
}

interface PreviewToken {
  token_number: number;
  visit_type_code: string;
  visit_type_label: string;
  duration_minutes: number;
  estimated_start_at: string;
  estimated_end_at: string;
  color_code: string;
}

interface PreviewData {
  appointment_date: string;
  can_create: boolean;
  active_extensions: any[];
  active_block_count: number;
  block_number: number;
  max_blocks: number;
  base_token_count: number;
  existing_extra_token_count: number;
  extra_token_count: number;
  effective_token_count: number;
  total_duration_minutes: number;
  token_range: { from: number; to: number };
  mix: Array<{
    treatment_code: string;
    treatment_name: string;
    token_count: number;
    duration_minutes: number;
    allocated_minutes: number;
  }>;
  tokens: PreviewToken[];
}

interface ExtensionRow {
  id: number;
  fk_slot_id: number;
  block_number: number;
  base_token_count: number;
  appointment_date: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  extra_token_count: number;
  total_duration_seconds: number;
  status: "ACTIVE" | "CANCELLED";
  booked_extra_tokens: number;
}

const localToday = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatTokenTime = (value: string) =>
  value?.endsWith(":00") ? value.slice(0, 5) : value;

export default function ExtraSlotTokenManager({
  token,
  branchId,
  addToast,
}: ExtraSlotTokenManagerProps) {
  const [appointmentDate, setAppointmentDate] = useState(localToday());
  const [slotId, setSlotId] = useState("");
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const selectedSlot = useMemo(
    () => slots.find((slot) => Number(slot.id) === Number(slotId)) || null,
    [slots, slotId],
  );
  const selectedSlotExtensions = useMemo(
    () =>
      extensions.filter(
        (extension) => Number(extension.fk_slot_id) === Number(slotId),
      ),
    [extensions, slotId],
  );
  const latestActiveBlock = useMemo(
    () =>
      selectedSlotExtensions
        .filter((extension) => extension.status === "ACTIVE")
        .reduce(
          (latest, extension) =>
            !latest || extension.block_number > latest.block_number
              ? extension
              : latest,
          null as ExtensionRow | null,
        ),
    [selectedSlotExtensions],
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchSetup = async () => {
    if (!branchId) return;
    try {
      const response = await fetch(
        `/api/v1/receptionist/form-data?branch_id=${branchId}`,
        { headers: authHeaders },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      const branchSlots = (result.data?.slots || []).filter(
        (slot: SlotOption) => Number(slot.fk_branch_id) === Number(branchId),
      );
      setSlots(branchSlots);
      setSlotId((current) =>
        branchSlots.some((slot: SlotOption) => String(slot.id) === current)
          ? current
          : String(branchSlots[0]?.id || ""),
      );
    } catch (error: any) {
      addToast(error?.message || "Unable to load branch slots", "error");
    }
  };

  const fetchExtensions = async () => {
    if (!branchId) return;
    try {
      const query = new URLSearchParams({
        branch_id: String(branchId),
        appointment_date: appointmentDate,
      });
      const response = await fetch(
        `/api/v1/receptionist/token-extensions?${query}`,
        { headers: authHeaders },
      );
      const result = await response.json();
      if (result.success) setExtensions(result.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setPreview(null);
    fetchSetup();
  }, [branchId, token]);

  useEffect(() => {
    setPreview(null);
    fetchExtensions();
  }, [branchId, appointmentDate, token]);

  useEffect(() => {
    setPreview(null);
  }, [slotId]);

  const handlePreview = async () => {
    if (!branchId || !slotId || !appointmentDate) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        branch_id: String(branchId),
        slot_id: slotId,
        appointment_date: appointmentDate,
      });
      const response = await fetch(
        `/api/v1/receptionist/token-extensions/preview?${query}`,
        { headers: authHeaders },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setPreview(result.data);
    } catch (error: any) {
      setPreview(null);
      addToast(error?.message || "Unable to preview extra tokens", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!branchId || !slotId || !appointmentDate) return;
    setCreating(true);
    try {
      const response = await fetch("/api/v1/receptionist/token-extensions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          branch_id: branchId,
          slot_id: Number(slotId),
          appointment_date: appointmentDate,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      addToast(result.message || "Extra tokens added successfully", "success");
      setPreview(null);
      await fetchExtensions();
    } catch (error: any) {
      addToast(error?.message || "Unable to add extra tokens", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (extension: ExtensionRow) => {
    const reason = window.prompt(
      "Why are you cancelling this extra-token block?",
    )?.trim();
    if (!reason) return;

    setCancellingId(extension.id);
    try {
      const response = await fetch(
        `/api/v1/receptionist/token-extensions/${extension.id}/cancel`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ branch_id: branchId, reason }),
        },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      addToast(result.message || "Extra-token block cancelled", "success");
      setPreview(null);
      await fetchExtensions();
    } catch (error: any) {
      addToast(error?.message || "Unable to cancel extra tokens", "error");
    } finally {
      setCancellingId(null);
    }
  };

  if (!branchId) return null;

  return (
    <div className="bg-white rounded-[40px] border border-gray-200 shadow-sm p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h4 className="text-lg font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <CalendarPlus className="text-[#549E9E]" size={20} />
            Slot-Specific Extra Tokens
          </h4>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Add up to four 60-minute blocks, one by one, after the last token.
          </p>
        </div>
        <div className="rounded-2xl bg-[#549E9E]/5 border border-[#549E9E]/15 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#468686]">
          Base {preview?.base_token_count || "configured"} tokens · Maximum 4 extra hours
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
            Appointment Date
          </label>
          <input
            type="date"
            min={localToday()}
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#549E9E]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
            Clinic Slot
          </label>
          <select
            value={slotId}
            onChange={(event) => setSlotId(event.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#549E9E]/20"
          >
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.slot_name} ({slot.start_time.slice(0, 5)} -{" "}
                {slot.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || !slotId}
          className="h-[44px] flex items-center justify-center gap-2 bg-[#549E9E] text-white rounded-xl px-5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? (
            <RefreshCcw size={16} className="animate-spin" />
          ) : (
            <Clock3 size={16} />
          )}
          Preview Next Extra Hour
        </button>
      </div>

      {preview && (
        <div className="rounded-[28px] border border-[#549E9E]/20 bg-[#549E9E]/5 p-5 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Summary
              label="Next Block"
              value={`${preview.block_number} of ${preview.max_blocks}`}
            />
            <Summary label="Extra Time" value={`${preview.total_duration_minutes} min`} />
            <Summary label="Extra Tokens" value={String(preview.extra_token_count)} />
            <Summary
              label="Token Range"
              value={`#${preview.token_range.from}-#${preview.token_range.to}`}
            />
            <Summary
              label="Effective Plate"
              value={`${preview.effective_token_count} tokens`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {preview.mix.map((item) => (
              <div key={item.treatment_code} className="rounded-2xl bg-white border border-gray-100 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {item.treatment_name}
                </p>
                <p className="mt-2 text-sm font-black text-gray-800">
                  {item.token_count} tokens × {item.duration_minutes} min
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#549E9E] mt-1">
                  {item.allocated_minutes} minutes
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
            {preview.tokens.map((item) => (
              <div
                key={item.token_number}
                className="rounded-xl border bg-white p-2 text-center shadow-sm"
                style={{ borderColor: item.color_code }}
              >
                <span className="inline-block rounded-full bg-amber-50 text-amber-600 px-1.5 py-0.5 text-[8px] font-black uppercase">
                  Extra
                </span>
                <p className="text-base font-black text-gray-900 mt-1">
                  #{item.token_number}
                </p>
                <p
                  className="text-[8px] font-black uppercase truncate"
                  style={{ color: item.color_code }}
                  title={item.visit_type_label}
                >
                  {item.visit_type_label}
                </p>
                <p className="text-[10px] font-bold text-gray-500 mt-1">
                  {formatTokenTime(item.estimated_start_at)}
                </p>
              </div>
            ))}
          </div>

          {preview.can_create ? (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {creating ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Confirm Block {preview.block_number} and Add 12 Tokens
            </button>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center text-[10px] font-black uppercase tracking-widest text-amber-700">
              Maximum four extra-hour blocks are already active for this slot.
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-black uppercase tracking-widest text-gray-700">
            Extensions for {appointmentDate}
          </h5>
          <button
            type="button"
            onClick={fetchExtensions}
            className="text-[#549E9E] p-2 hover:bg-[#549E9E]/5 rounded-full"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
        {extensions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-xs font-bold text-gray-400">
            No extra-token block exists for this date.
          </div>
        ) : (
          extensions.map((extension) => {
            const isLatestActive =
              extension.status === "ACTIVE" &&
              latestActiveBlock?.id === extension.id;
            return (
            <div
              key={extension.id}
              className="rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-black text-gray-800">
                  {extension.slot_name} · Block {extension.block_number} · Tokens #
                  {Number(extension.base_token_count) + 1}-#
                  {Number(extension.base_token_count) + Number(extension.extra_token_count)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                  {extension.total_duration_seconds / 60} minutes ·{" "}
                  {extension.booked_extra_tokens} booked
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                    extension.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {extension.status}
                </span>
                {extension.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={
                      cancellingId === extension.id ||
                      Number(extension.booked_extra_tokens) > 0 ||
                      !isLatestActive
                    }
                    onClick={() => handleCancel(extension)}
                    title={
                      Number(extension.booked_extra_tokens) > 0
                        ? "Booked extra tokens must be rescheduled or cancelled first"
                        : !isLatestActive
                          ? "Cancel the latest active block first"
                          : "Cancel extra-token block"
                    }
                    className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-600 disabled:opacity-40"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="text-lg font-black text-gray-800 mt-1">{value}</p>
    </div>
  );
}
