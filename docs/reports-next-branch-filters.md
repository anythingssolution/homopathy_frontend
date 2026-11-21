# Reports Next branch filters

Accepted behavior implemented on 20 November 2026.

Reports Next is independent of the dashboard's operational Current Branch. Each
submenu starts at All Branches and has its own report selector. Switching menus
or refreshing starts the newly mounted report at All Branches. Changing its
branch preserves its existing date and other report filters, reloads its cards,
charts and lists, and resets list pagination. Print/CSV data uses those filtered
rows. Individual rows identify their branch where records are branch-specific.

The Create Patient shortcut remains available beside the report selector.
Reports Next does not need an operational branch selection; other protected
modules continue to require it.

## API boundary

All Reports Next reads explicitly send `report_scope=independent` with
`branch_id=all` or an individual branch ID. The server resolves the user's active
branch assignments on every request. It restricts All Branches to that set and
rejects inaccessible selections. Local report selections never call
`/auth/selected-branch` or change `master_users.selected_branch_id`.

The shared report client still supports Bills Next and legacy reports: calls
without the independent option retain their original selected-branch behavior
and use separate cache entries.

Scope covers Now, Appointments (including card lists and all Booked vs Consulted
drilldown levels), Follow-ups, Patients Not Returned, First Consults, Test
Register, Dispensary, Courier Register, Collections, Patients, Location-wise
Patients, Patient Sources, Diagnosis and Compare.

Read-only appointment prescription, medical prescription and bill previews have
report-specific endpoints that authorize the actual entity branch. Operational
consultation editing, pricing and payment endpoints retain their working-branch
rules. Patient Record/Consult links leave Reports Next and use those modules'
existing rules; the report selector never silently switches the operational
branch for them.

Test Register's Report Send action validates its actual source branch against
the report's accessible branch set. Existing status/reason rules are unchanged.

## Aggregation details

- Patient registration summaries use the existing account creation date range.
  For a particular/restricted branch set, account membership is established via
  active appointments or bills at those branches. This is not an inferred
  registration/creation branch: the database does not store that fact.
- All Branches includes unlinked registrations only when every active clinic
  branch is accessible. A patient appearing in multiple selected branches is
  counted once in registration summaries.
- Combined Not Returned data uses the latest consultation across selected
  accessible branches. A recent return at another included branch prevents a
  false overdue entry. An individual branch selection keeps that branch's view.
- Location aggregates continue counting people independently of consultation
  counts and inherit family members' address from the primary account.
- Pending dispensary backlog and Not Returned retain their existing time-window
  semantics; adding a branch selector does not turn them into new date-based
  reports.

## Validation

- Backend tests cover independent defaults, access denial, malformed branch IDs,
  entity drilldowns, report-send source authorization and unchanged legacy scope.
- Frontend cache tests distinguish independent All Branches, individual report
  branches, and existing selected-branch requests; working-branch changes do not
  change the independent cache key.
- Connection-local temporary-table tests cover multi-branch dispensary totals,
  return-at-another-branch behavior and registration membership/deduplication.
- Local read-only HTTP checks cover all report modules and individual branches,
  reconcile combined totals, open cross-branch prescription/bill previews, and
  verify the doctor's stored working branch is unchanged.

No SQL migration or permanent data update is required. Deploy frontend and
backend together because independent report scope requires both changes.
