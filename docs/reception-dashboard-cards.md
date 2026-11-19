# Reception dashboard cards

Implemented 17 November 2026 in the shared Receptionist Portal, including authorized cross-role access. No database migration or backend workflow change is required.

## Scope and definitions

Queue tab shows six clickable cards above the existing filters. Counts use all loaded appointments for the selected branch, date, slot and treatment, before patient/token search or client pagination. Clearing the existing date picker retains its all-dates behavior. Each appointment counts once, including separate family-member bookings; cancelled, rejected and inactive rows are excluded.

| Card | Rule |
| --- | --- |
| Total Appointments | All eligible appointments in the current scope |
| Approval Pending | Reception approval not completed; excludes completed/current consultations |
| Not Arrived | Approved but not currently present, including patients who left or were marked no-show/skipped |
| Waiting | Backend runtime READY or CALLED bucket |
| In Consultation | Backend runtime IN_PROGRESS bucket |
| Completed | Completed appointment/queue state, regardless of old check-in or reception values |

The five workflow-stage counts are exclusive and sum to Total. Completed is checked before arrival state; completed patients must not be counted as Not Arrived because the runtime queue stops tracking them. Runtime buckets take priority over raw queue status, so a paused IN_PROGRESS row projected as READY belongs in Waiting. For legacy responses missing runtime buckets, the classifier uses queue status and current check-in together.

Completion percentage = Completed / Total × 100, rounded to one decimal; empty scope is 0%, never NaN.

## Interaction and loading

- Card click filters the existing appointment list. Clicking the selected stage again or Clear filter returns to Total.
- Switching cards resets pagination and clears bulk selection, preventing hidden selected appointments from being rejected accidentally. A shrinking result set clamps the current page.
- Patient/token search only narrows the list. Cards remain a stable overview of the selected date/slot/treatment.
- Existing successful approval, check-in, rejection, refresh and queue/socket updates refresh the same appointment source and therefore the cards.
- Date/branch requests carry a scope key and request sequence: late results cannot replace a newer context. Old-branch/date rows are hidden while the new context loads. A failed refresh shows an explicit error and offers Retry; already loaded data remains identified as old data.
- Responsive grid: 6 columns on desktop, 3 on tablet, 2 on mobile. Cards use native keyboard-operable buttons, pressed state, visible focus and labelled progress. English/Hindi labels are available.

## Validation

Eight helper tests cover exclusive stages, cancellation/rejection, completed-row precedence, paused/left patients, branch/date/slot/treatment scope, all dates, pagination-sized datasets, duplicate IDs, workflow transitions and empty scopes. TypeScript and production web/TV builds passed.

Read-only local-browser checks for 16 November: 50 total / 49 completed / 1 waiting (98%); morning 31/31 (100%); evening 18/19 (94.7%). Card filtering, toggling/clearing, page reset, search independence and treatment scope were checked. Mobile at 390px showed two cards per row and no horizontal overflow. No appointment/payment/queue mutation was made during these checks.
