import React from "react";
import { FileText, Plus, Trash2 } from "lucide-react";

export type InvestigationEntry = {
  id?: number | null;
  investigation_type: string;
  test_name: string;
  investigation_date: string;
  status: string;
  findings: string;
  report_reference: string;
  document_id?: number | null;
};

type Props = {
  value: InvestigationEntry[];
  onChange: (rows: InvestigationEntry[]) => void;
  disabled?: boolean;
};

export const INVESTIGATION_TYPE_OPTIONS = [
  { value: "X_RAY", label: "X-Ray" },
  { value: "SONOGRAPHY", label: "Sonography" },
  { value: "CT_SCAN", label: "CT Scan" },
  { value: "MRI", label: "MRI" },
  { value: "PET_CT", label: "PET CT" },
  { value: "BLOOD_INVESTIGATION", label: "Blood Investigation" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "ADVISED", label: "Advised" },
  { value: "DONE", label: "Done" },
  { value: "REPORT_SEEN", label: "Report Seen" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
];

export const createBlankInvestigation = (): InvestigationEntry => ({
  id: null,
  investigation_type: "X_RAY",
  test_name: "",
  investigation_date: "",
  status: "DONE",
  findings: "",
  report_reference: "",
  document_id: null,
});

export const normalizeInvestigationRows = (rows: unknown): InvestigationEntry[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row: any) => ({
      id: row?.id ? Number(row.id) : null,
      investigation_type: String(row?.investigation_type || row?.type || "X_RAY"),
      test_name: String(row?.test_name || row?.testName || ""),
      investigation_date: String(row?.investigation_date || row?.investigationDate || "").slice(0, 10),
      status: String(row?.status || "DONE"),
      findings: String(row?.findings || ""),
      report_reference: String(row?.report_reference || row?.reportReference || ""),
      document_id: row?.document_id ? Number(row.document_id) : null,
    }))
    .filter((row) => (
      row.id ||
      row.test_name.trim() ||
      row.investigation_date.trim() ||
      row.findings.trim() ||
      row.report_reference.trim()
    ));
};

export const hasInvestigationContent = (row: InvestigationEntry) => (
  Boolean(row.id) ||
  row.test_name.trim().length > 0 ||
  row.investigation_date.trim().length > 0 ||
  row.findings.trim().length > 0 ||
  row.report_reference.trim().length > 0
);

export const toInvestigationPayload = (rows: InvestigationEntry[]) => rows
  .filter(hasInvestigationContent)
  .map((row) => ({
    id: row.id || undefined,
    investigation_type: row.investigation_type,
    test_name: row.test_name.trim(),
    investigation_date: row.investigation_date || null,
    status: row.status || "DONE",
    findings: row.findings.trim(),
    report_reference: row.report_reference.trim(),
    document_id: row.document_id || null,
  }));

const InvestigationRows = ({ value, onChange, disabled = false }: Props) => {
  const rows = value.length > 0 ? value : [createBlankInvestigation()];
  const fieldClass =
    "h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-xs font-extrabold text-gray-800 outline-none transition-all focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 disabled:opacity-70";
  const labelClass =
    "mb-1 block text-[9px] font-black uppercase tracking-widest text-gray-500";

  const updateRow = (
    index: number,
    key: keyof InvestigationEntry,
    nextValue: string,
  ) => {
    onChange(
      rows.map((row, rowIndex) => (
        rowIndex === index ? { ...row, [key]: nextValue } : row
      )),
    );
  };

  const addRow = () => {
    onChange([...rows, createBlankInvestigation()]);
  };

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    onChange(nextRows.length > 0 ? nextRows : [createBlankInvestigation()]);
  };

  return (
    <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4">
      <div className="mb-3 flex flex-col gap-3 border-b border-gray-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#549E9E]">
            <FileText size={15} />
            Investigation Details
          </label>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            X-Ray, Sonography, CT Scan, MRI, PET CT, Blood Investigation
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addRow}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[#549E9E]/25 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-[#427f7f] shadow-sm transition-all hover:bg-[#549E9E]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={13} />
          Add Investigation
        </button>
      </div>

      <div className="space-y-2.5">
        {rows.map((row, index) => (
          <div
            key={`${row.id || "new"}-${index}`}
            className="rounded-lg border border-gray-200 bg-white/90 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Investigation {index + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeRow(index)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-500 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Remove investigation"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className={labelClass}>
                  Type
                </label>
                <select
                  disabled={disabled}
                  value={row.investigation_type}
                  onChange={(event) => updateRow(index, "investigation_type", event.target.value)}
                  className={fieldClass}
                >
                  {INVESTIGATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>
                  Test / Body Part
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={row.test_name}
                  onChange={(event) => updateRow(index, "test_name", event.target.value)}
                  className={fieldClass}
                  placeholder="e.g. CBC, Chest, Abdomen"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Date
                </label>
                <input
                  type="date"
                  disabled={disabled}
                  value={row.investigation_date}
                  onChange={(event) => updateRow(index, "investigation_date", event.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-3">
                <label className={labelClass}>
                  Status
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateRow(index, "status", option.value)}
                      className={`min-h-7 rounded px-1.5 text-[9px] font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                        row.status === option.value
                          ? "bg-[#549E9E] text-white shadow-sm"
                          : "text-gray-500 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-7">
                <label className={labelClass}>
                  Findings / Notes
                </label>
                <textarea
                  disabled={disabled}
                  value={row.findings}
                  onChange={(event) => updateRow(index, "findings", event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white p-2.5 text-xs font-extrabold text-gray-800 outline-none transition-all focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 disabled:opacity-70"
                  placeholder="Report impression, important values, clinical note..."
                />
              </div>

              <div className="md:col-span-5">
                <label className={labelClass}>
                  Report Reference
                </label>
                <textarea
                  disabled={disabled}
                  value={row.report_reference}
                  onChange={(event) => updateRow(index, "report_reference", event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white p-2.5 text-xs font-extrabold text-gray-800 outline-none transition-all focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 disabled:opacity-70"
                  placeholder="Lab name, report number, outside reference..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestigationRows;
