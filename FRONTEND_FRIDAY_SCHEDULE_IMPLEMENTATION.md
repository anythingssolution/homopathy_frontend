# Frontend Implementation Guide: Devendra Nagar (Pandri Branch) Friday Schedule Rule

This guide documents the frontend changes required for the **Devendra Nagar (Pandri Branch, `branch_id = 2`) Friday Schedule Rule**, where **every Friday**, the first available slot starts at **3:00 PM (`15:00:00`)**.

---

## 📌 Executive Summary

- **Location / Branch**: Devendra Nagar / Pandri Branch (`branch_id = 2`)
- **Recurring Schedule Rule**: Every **Friday**, the first available slot starts at **3:00 PM (`15:00:00`)** instead of the default morning time (e.g. `11:30 AM`).
- **Impacted Frontend Areas**:
  1. Patient Appointment Booking Flow (`/booking`)
  2. Receptionist Desk Booking Modal (`/receptionist/appointments/new`)
  3. Token Plate & Grid View (`/receptionist/token-plate`)
  4. Live Queue Display / Waiting Room TV View (`/live-queue`)
  5. Doctor Slot Override Management (`/doctor/slot-overrides`)

---

## 🛠️ 1. API Endpoint Responses & Data Fields

The backend automatically calculates effective slot timing based on `appointment_date`. Frontend developers must rely on `effective_start_time`, `effective_end_time`, `has_override`, and `reason` fields returned by backend APIs.

### A. Appointment Form Data Endpoint
**Endpoint**: `GET /api/v1/appointments/form-data?branch_id=2` or `GET /api/v1/receptionist/form-data?branch_id=2`

**API Response**:
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "id": 3,
        "fk_branch_id": 2,
        "slot_name": "Morning Session",
        "start_time": "11:30:00",
        "end_time": "17:30:00",
        "default_consult_minutes": 15
      }
    ]
  }
}
```

### B. Token Plate & Effective Slot Timing Endpoint
**Endpoint**: `GET /api/v1/appointments/token-plate?branch_id=2&slot_id=3&treatment_id=1&appointment_date=2026-08-14`

**API Response**:
```json
{
  "success": true,
  "data": {
    "slot": {
      "slot_id": 3,
      "branch_id": 2,
      "slot_name": "Morning Session",
      "default_start_time": "11:30:00",
      "default_end_time": "17:30:00",
      "effective_start_time": "15:00:00",
      "effective_end_time": "21:00:00",
      "has_override": true,
      "reason": "Devendra Nagar (Pandri Branch) Friday recurring schedule: first slot starts at 3:00 PM"
    }
  }
}
```

---

## 🎨 2. UI & Component Requirements

### 1. Patient Booking Form & Date Selection
- **Component**: `AppointmentBookingForm.tsx` / `DateSlotSelector.tsx`
- **Behavior**:
  - When the user selects `Pandri Branch (branch_id = 2)` AND selects a **Friday** date:
    - Update slot pill/dropdown start time display to **`3:00 PM`** (instead of `11:30 AM`).
    - Display an informational badge below the date picker:
      > ℹ️ **Friday Schedule**: *Devendra Nagar branch opens at 3:00 PM on Fridays.*

```tsx
// React / TS Example Badge Rendering
{selectedBranchId === 2 && isFriday(selectedDate) && (
  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-amber-800 text-sm mt-2">
    <span className="font-semibold">Friday Schedule Note:</span> First available slot for Devendra Nagar Branch starts at <strong>3:00 PM</strong>.
  </div>
)}
```

---

### 2. Receptionist Appointment Booking Modal
- **Component**: `ReceptionistBookingModal.tsx`
- **Behavior**:
  - When selecting `branch_id = 2` and a **Friday** date:
    - Re-query `/api/v1/appointments/token-plate` or call slot resolution with selected `appointment_date`.
    - Automatically update token estimated start times starting from **`15:00:00`** (3:00 PM).
    - If manual custom appointment time is entered, validate `time >= '15:00:00'`.

---

### 3. Token Plate & Time Grid View
- **Component**: `TokenPlateGrid.tsx`
- **Behavior**:
  - Compute token plate timeline slots relative to `effective_start_time` (`15:00:00`).
  - Render the top timeline header starting from `3:00 PM`.

---

### 4. Live Queue TV / Display View
- **Component**: `LiveQueueTvScreen.tsx`
- **Behavior**:
  - Real-time socket events `queue-updated` and `doctor-session-started` send live projected start times.
  - Render estimated wait times and projected start times anchored to **`15:00`** on Fridays for Branch 2.

---

### 5. Doctor Slot Override Management
- **Component**: `DoctorSlotOverrides.tsx`
- **Behavior**:
  - Show a **"Recurring Rule"** tag for Friday slot override table for Branch 2:
    - Status: `RECURRING_RULE`
    - Timing: `03:00 PM - 09:00 PM`
    - Reason: `Devendra Nagar Friday Recurring Rule`

---

## ⚡ 3. Business Logic & Validation Rules

### Friday Date Utility Helper (`dateUtils.ts`)
```typescript
export const isFridayDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getDay() === 5; // 5 = Friday in JS
};

export const getEffectiveSlotDisplayTime = (
  branchId: number,
  slotStartTime: string,
  appointmentDate: string
): string => {
  if (branchId === 2 && isFridayDate(appointmentDate) && slotStartTime < '15:00:00') {
    return '03:00 PM';
  }
  return formatTimeTo12Hour(slotStartTime);
};
```

---

## 📋 4. Checklist for Frontend Developer

- [ ] Add `isFridayDate` helper in `src/utils/dateUtils.ts`.
- [ ] Add Friday schedule notice badge in Patient Booking date picker when `branch_id === 2` and date is Friday.
- [ ] Re-fetch effective slot timings when `appointment_date` changes in Receptionist Booking Form.
- [ ] Update Token Plate Grid timeline header to parse `effective_start_time`.
- [ ] Add client-side validation preventing manual booking time entries before `15:00` for Branch 2 on Fridays.
- [ ] Test frontend flow by selecting **2026-08-14 (Friday)** and verifying `03:00 PM` slot display.
