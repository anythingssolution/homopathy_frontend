import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

type DoctorLeaveEntry = {
  leave_id: number;
  doctor_id: number;
  branch_id: number;
  branch_name: string;
  leave_date: string;
  leave_reason: string | null;
  status: 'ACTIVE' | 'CANCELLED';
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthDatesBetween = (startDate: string, endDate: string) => {
  const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const dates: string[] = [];

  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (cursor <= last) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export default function DoctorLeaveCalendar() {
  const { t } = useTranslation();
  const { token, branchScope } = useAuth();
  const { addToast } = useNotifications();

  const todayString = useMemo(() => formatLocalDate(new Date()), []);
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaves, setLeaves] = useState<DoctorLeaveEntry[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dragAnchorDate, setDragAnchorDate] = useState<string | null>(null);
  const [dragHoverDate, setDragHoverDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didDragMove, setDidDragMove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBranchId = branchScope?.selected_branch_id || null;
  const selectedBranchName = branchScope?.selected_branch?.branch_name || t('doctor_leave.selected_branch', 'Selected Branch');
  const monthKey = formatMonthKey(viewDate);

  useEffect(() => {
    if (!token || !selectedBranchId) {
      setLeaves([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const fetchLeaves = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/doctors/leaves?month=${encodeURIComponent(monthKey)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        const result = await response.json();
        if (result.success) {
          setLeaves(Array.isArray(result.data) ? result.data : []);
        } else {
          setLeaves([]);
          setError(result.message || t('doctor_leave.fetch_error', 'Failed to load leave calendar'));
        }
      } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') {
          return;
        }
        setLeaves([]);
        setError(t('doctor_leave.network_error', 'Network error while loading leave calendar'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaves();

    return () => controller.abort();
  }, [token, selectedBranchId, monthKey, t]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (!dragAnchorDate) {
        setIsDragging(false);
        setDidDragMove(false);
        return;
      }

      if (dragAnchorDate && dragHoverDate) {
        const rangeDates = getMonthDatesBetween(dragAnchorDate, dragHoverDate);

        setSelectedDates((previous) => {
          if (!didDragMove && rangeDates.length === 1) {
            const onlyDate = rangeDates[0];
            return previous.includes(onlyDate)
              ? previous.filter((value) => value !== onlyDate)
              : [...previous, onlyDate].sort();
          }

          return Array.from(new Set([...previous, ...rangeDates])).sort();
        });
      }

      setIsDragging(false);
      setDidDragMove(false);
      setDragAnchorDate(null);
      setDragHoverDate(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [didDragMove, dragAnchorDate, dragHoverDate]);

  const leaveDateMap = useMemo(
    () => new Map(leaves.map((leave) => [leave.leave_date, leave])),
    [leaves]
  );

  const dragPreviewDates = useMemo(() => {
    if (!dragAnchorDate || !dragHoverDate) {
      return [];
    }

    return getMonthDatesBetween(dragAnchorDate, dragHoverDate);
  }, [dragAnchorDate, dragHoverDate]);

  const previewDateSet = useMemo(() => new Set(dragPreviewDates), [dragPreviewDates]);
  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const selectedExistingLeaveDates = useMemo(
    () => selectedDates.filter((date) => leaveDateMap.has(date)),
    [leaveDateMap, selectedDates]
  );

  const selectedNewLeaveDates = useMemo(
    () => selectedDates.filter((date) => !leaveDateMap.has(date)),
    [leaveDateMap, selectedDates]
  );

  const selectedLeaveReasonPreview = useMemo(() => {
    if (selectedExistingLeaveDates.length === 1) {
      return leaveDateMap.get(selectedExistingLeaveDates[0])?.leave_reason || '';
    }
    return '';
  }, [leaveDateMap, selectedExistingLeaveDates]);

  useEffect(() => {
    if (!leaveReason.trim() && selectedLeaveReasonPreview) {
      setLeaveReason(selectedLeaveReasonPreview);
    }
  }, [leaveReason, selectedLeaveReasonPreview]);

  const monthLabel = useMemo(
    () => viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [viewDate]
  );

  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      date: string;
      day: number;
      isPast: boolean;
      hasLeave: boolean;
    } | null> = [];

    for (let index = 0; index < firstDayOfWeek; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${monthKey}-${String(day).padStart(2, '0')}`;
      cells.push({
        date,
        day,
        isPast: date < todayString,
        hasLeave: leaveDateMap.has(date),
      });
    }

    return cells;
  }, [leaveDateMap, monthKey, todayString, viewDate]);

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    setSelectedDates([]);
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    setSelectedDates([]);
  };

  const handleCellMouseDown = (date: string, isPast: boolean) => {
    if (isPast) {
      return;
    }

    setDragAnchorDate(date);
    setDragHoverDate(date);
    setIsDragging(true);
    setDidDragMove(false);
  };

  const handleCellMouseEnter = (date: string, isPast: boolean) => {
    if (!isDragging || !dragAnchorDate || isPast) {
      return;
    }

    if (date !== dragHoverDate) {
      setDidDragMove(true);
    }
    setDragHoverDate(date);
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setLeaveReason('');
  };

  const handleSaveSelectedLeaves = async () => {
    if (!selectedBranchId || !token || selectedDates.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/doctors/leaves/bulk', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          leave_dates: selectedDates,
          leave_reason: leaveReason.trim() || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const returnedLeaves = Array.isArray(result.data?.leaves) ? result.data.leaves : [];
        const returnedMap = new Map(returnedLeaves.map((leave: DoctorLeaveEntry) => [leave.leave_date, leave]));
        setLeaves((previous) => {
          const filtered = previous.filter((leave) => !returnedMap.has(leave.leave_date));
          return [...filtered, ...returnedLeaves].sort((left, right) => left.leave_date.localeCompare(right.leave_date));
        });
        addToast(result.message || t('doctor_leave.bulk_save_success', 'Selected leave dates saved successfully'), 'success');
        clearSelection();
      } else {
        addToast(result.message || t('doctor_leave.save_error', 'Failed to save leave'), 'error');
      }
    } catch {
      addToast(t('doctor_leave.network_save_error', 'Network error while saving leave'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSelectedLeaves = async () => {
    if (!selectedBranchId || !token || selectedExistingLeaveDates.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/doctors/leaves/bulk-cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          leave_dates: selectedExistingLeaveDates,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLeaves((previous) => previous.filter((leave) => !selectedExistingLeaveDates.includes(leave.leave_date)));
        addToast(result.message || t('doctor_leave.bulk_remove_success', 'Selected leave dates cancelled successfully'), 'success');
        clearSelection();
      } else {
        addToast(result.message || t('doctor_leave.remove_error', 'Failed to cancel leave'), 'error');
      }
    } catch {
      addToast(t('doctor_leave.network_remove_error', 'Network error while cancelling leave'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedBranchId) {
    return (
      <div className="bg-white border border-amber-100 shadow-sm p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
          <AlertCircle size={22} />
        </div>
        <div>
          <p className="text-sm font-black text-amber-600 uppercase tracking-widest">
            {t('doctor_leave.branch_required_title', 'Select branch first')}
          </p>
          <p className="text-sm text-amber-500 mt-1">
            {t('doctor_leave.branch_required_message', 'Please choose your clinic branch before managing doctor leave dates.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-teal/10 text-primary-teal flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-800 uppercase tracking-widest">
                {t('doctor_leave.title', 'Leave Calendar')}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                {t('doctor_leave.subtitle', 'Drag on dates to select a leave range')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-teal/5 border border-primary-teal/10 text-primary-teal">
              <MapPin size={14} />
              <span className="text-[11px] font-black uppercase tracking-widest">{selectedBranchName}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-600">
              <Sparkles size={14} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {t('doctor_leave.drag_hint', 'Click + drag for range')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-x-6 gap-y-3">
            <div className="flex-shrink-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">
                {t('doctor_leave.usage_title', 'How to use')}
              </p>
            </div>
            <ul className="flex flex-col md:flex-row md:flex-wrap gap-x-8 gap-y-2 text-[13px] font-medium text-amber-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {t('doctor_leave.usage_drag', '1. Mouse press karke dates par drag karo to range select ho jayega.')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {t('doctor_leave.usage_click_more', '2. Alag dates par click/drag karke multiple selections add kar sakte ho.')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {t('doctor_leave.usage_save', '3. “Mark Selected Dates” se saari selected dates ek sath save hongi.')}
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,720px)_1fr] gap-0">
          <div className="p-5 xl:p-6 border-b xl:border-b-0 xl:border-r border-gray-100">
            <div className="max-w-[720px]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="w-10 h-10 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 hover:bg-primary-teal hover:text-white hover:border-primary-teal transition-all flex items-center justify-center"
                >
                  <ChevronLeft size={17} />
                </button>
                <div className="text-center">
                  <p className="text-lg font-black text-gray-800 tracking-tight">{monthLabel}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mt-1">
                    {t('doctor_leave.selection_count', '{{count}} dates selected', { count: selectedDates.length })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="w-10 h-10 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 hover:bg-primary-teal hover:text-white hover:border-primary-teal transition-all flex items-center justify-center"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {weekdayLabels.map((day) => (
                  <div key={day} className="text-center text-[9px] font-black text-primary-teal/50 uppercase tracking-widest py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 select-none">
                {calendarCells.map((cell, index) => {
                  if (!cell) {
                    return <div key={`blank-${index}`} className="aspect-square rounded-xl bg-transparent" />;
                  }

                  const isInPreview = previewDateSet.has(cell.date);
                  const isSelected = selectedDateSet.has(cell.date);
                  const isToday = cell.date === todayString;

                  return (
                    <motion.button
                      key={cell.date}
                      type="button"
                      whileHover={{ y: cell.isPast ? 0 : -1 }}
                      whileTap={{ scale: cell.isPast ? 1 : 0.98 }}
                      onMouseDown={() => handleCellMouseDown(cell.date, cell.isPast)}
                      onMouseEnter={() => handleCellMouseEnter(cell.date, cell.isPast)}
                      className={`aspect-square rounded-[18px] border p-1.5 transition-all text-left relative overflow-hidden ${
                        cell.isPast
                          ? 'bg-gray-50/60 border-gray-100 text-gray-300 cursor-not-allowed'
                          : isInPreview
                            ? 'bg-primary-teal/15 border-primary-teal/30 text-primary-teal'
                            : isSelected
                              ? 'bg-primary-teal text-white border-primary-teal shadow-lg shadow-primary-teal/15'
                              : cell.hasLeave
                                ? 'bg-red-50 border-red-100 text-red-600 hover:border-red-200'
                                : 'bg-white border-gray-100 text-gray-700 hover:border-primary-teal/30 hover:bg-primary-teal/[0.03]'
                      }`}
                    >
                      <span className="absolute top-1.5 left-2 text-[11px] font-black">{cell.day}</span>
                      <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1">
                        {cell.hasLeave ? (
                          <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/85' : 'text-red-500'}`}>
                            {t('doctor_leave.leave_badge', 'Leave')}
                          </span>
                        ) : (
                          <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : isToday ? 'text-primary-teal' : 'text-gray-300'}`}>
                            {isToday ? t('doctor_leave.today_badge', 'Today') : ''}
                          </span>
                        )}
                        {cell.hasLeave && (
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span>{t('doctor_leave.legend_marked_leave', 'Marked Leave')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-teal" />
                  <span>{t('doctor_leave.legend_selected_date', 'Selected')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-teal/30" />
                  <span>{t('doctor_leave.legend_drag_preview', 'Drag Preview')}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest">
                      {t('doctor_leave.load_error_title', 'Unable to load calendar')}
                    </p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 bg-gray-50/40">
            <div className="bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                    {t('doctor_leave.selection_panel', 'Selection')}
                  </p>
                  <p className="text-lg font-black text-gray-800 mt-1">
                    {t('doctor_leave.selection_count', '{{count}} dates selected', { count: selectedDates.length })}
                  </p>
                </div>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <X size={12} />
                    {t('doctor_leave.clear_selection', 'Clear')}
                  </button>
                )}
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  {t('doctor_leave.reason_label', 'Reason (optional)')}
                </label>
                <textarea
                  value={leaveReason}
                  onChange={(event) => setLeaveReason(event.target.value)}
                  placeholder={t('doctor_leave.reason_placeholder', 'Common reason for selected leave dates')}
                  className="w-full min-h-[96px] rounded-[20px] border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-primary-teal/30 focus:ring-2 focus:ring-primary-teal/10 transition-all resize-none"
                />
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleSaveSelectedLeaves}
                  disabled={isSaving || isLoading || selectedDates.length === 0}
                  className="w-full rounded-full px-4 py-3.5 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 bg-primary-teal text-white hover:bg-[#438787] shadow-lg shadow-primary-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Calendar size={16} />}
                  {t('doctor_leave.mark_selected_button', 'Mark Selected Dates')}
                </button>

                <button
                  type="button"
                  onClick={handleRemoveSelectedLeaves}
                  disabled={isSaving || isLoading || selectedExistingLeaveDates.length === 0}
                  className="w-full rounded-full px-4 py-3.5 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {t('doctor_leave.remove_selected_button', 'Remove Selected Leave')}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    {t('doctor_leave.new_dates_count', 'New Dates')}
                  </p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{selectedNewLeaveDates.length}</p>
                </div>
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                    {t('doctor_leave.marked_dates_count', 'Existing Leave')}
                  </p>
                  <p className="text-xl font-black text-red-600 mt-1">{selectedExistingLeaveDates.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                    {t('doctor_leave.monthly_list_label', 'This month')}
                  </p>
                  <p className="text-base font-black text-gray-800 mt-1">
                    {t('doctor_leave.monthly_list_title', 'Saved leave dates')}
                  </p>
                </div>
                {isLoading && <LoaderCircle size={16} className="animate-spin text-primary-teal" />}
              </div>

              {selectedDates.length > 0 && (
                <div className="mb-3 rounded-2xl bg-primary-teal/[0.04] border border-primary-teal/10 px-3 py-3">
                  <p className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-2">
                    {t('doctor_leave.selected_dates_list', 'Selected dates')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.slice(0, 10).map((date) => (
                      <span key={date} className="px-2.5 py-1 rounded-full bg-white border border-primary-teal/10 text-[10px] font-black text-primary-teal uppercase tracking-widest">
                        {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    ))}
                    {selectedDates.length > 10 && (
                      <span className="px-2.5 py-1 rounded-full bg-white border border-primary-teal/10 text-[10px] font-black text-primary-teal uppercase tracking-widest">
                        +{selectedDates.length - 10}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {leaves.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 px-4 py-6 text-center">
                  <p className="text-sm font-bold text-gray-400">
                    {t('doctor_leave.empty_month', 'No leave dates marked for this month.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {leaves.map((leave) => {
                    const isSelected = selectedDateSet.has(leave.leave_date);
                    return (
                      <button
                        key={leave.leave_id}
                        type="button"
                        onClick={() => {
                          setSelectedDates((previous) => (
                            previous.includes(leave.leave_date)
                              ? previous.filter((value) => value !== leave.leave_date)
                              : [...previous, leave.leave_date].sort()
                          ));
                        }}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                          isSelected
                            ? 'border-primary-teal bg-primary-teal/[0.04]'
                            : 'border-gray-100 hover:border-primary-teal/20 hover:bg-primary-teal/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-gray-800">
                              {new Date(`${leave.leave_date}T00:00:00`).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {leave.leave_reason || t('doctor_leave.no_reason', 'No reason added')}
                            </p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                            {t('doctor_leave.leave_badge', 'Leave')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
