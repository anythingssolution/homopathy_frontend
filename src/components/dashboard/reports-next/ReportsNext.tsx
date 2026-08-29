import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import StaffBranchSwitcher from '../../StaffBranchSwitcher';
import { Sidebar, type BadgeCounts } from './Sidebar';
import { ReviewDateProvider } from './ReviewDateContext';
import { fetchReportModule, isoDate, rangeForFilter, rangeForFollowUpFilter } from './lib';

const emptyBadges: BadgeCounts = { followUps: 0, collections: 0, dispensary: 0 };

export default function ReportsNext() {
  const { token } = useAuth();
  const [badges, setBadges] = useState<BadgeCounts>(emptyBadges);

  const loadBadges = useCallback(async () => {
    if (!token) return;
    const open = rangeForFilter('3_months', { from: '', to: '' });
    const today = isoDate(new Date());
    const upcomingFollowUps = rangeForFollowUpFilter('3_months', { from: '', to: '' });
    try {
      const [clinicalUpcoming, billing, medical] = await Promise.all([
        fetchReportModule(token, 'clinical', upcomingFollowUps.from, upcomingFollowUps.to),
        fetchReportModule(token, 'billing', open.from, today),
        fetchReportModule(token, 'medical', open.from, today),
      ]);
      setBadges({
        followUps: Array.isArray(clinicalUpcoming?.followup_due) ? clinicalUpcoming.followup_due.length : 0,
        collections: Array.isArray(billing?.pending_amount) ? billing.pending_amount.length : 0,
        dispensary: Number(medical?.summary?.[0]?.ready_prescriptions_count || 0),
      });
    } catch {
      setBadges(emptyBadges);
    }
  }, [token]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  return (
    <ReviewDateProvider>
      <div className="flex flex-col md:block min-h-[calc(100vh-5rem)]">
        <aside className="w-full md:fixed md:left-0 md:top-20 md:bottom-0 md:w-72 z-20 no-print">
          <Sidebar badges={badges} />
        </aside>
        <div className="flex-1 min-w-0 md:ml-72 px-4 sm:px-6 lg:px-8 pt-3 pb-8 space-y-6">
          <div className="no-print">
            <StaffBranchSwitcher />
          </div>
          <Outlet />
        </div>
      </div>
    </ReviewDateProvider>
  );
}
