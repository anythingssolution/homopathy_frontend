# Backend Address Keys Documentation

This document outlines how the patient `address` is being passed to the backend API services. This functionality was added for the Patient Profile update, the Patient Registration form, and the Appointment Booking flow.

## 1. Patient Registration API
- **Endpoint:** `POST /api/v1/auth/register`
- **Role:** Patient
- **Payload Key:** `address` (Type: `string | undefined`)
- **Description:** Included in the final registration step (`regStep === 2`) along with `full_name`, `age`, `gender`, `email`, `mobile_no`, and `password`. The address is optional, so it passes `undefined` if not provided.

## 2. Patient Profile Update API
- **Endpoint:** `PATCH /api/v1/auth/me`
- **Role:** Patient
- **Payload Key:** `address` (Type: `string | undefined`)
- **Description:** Sent from the Profile settings (`src/components/dashboard/Profile.tsx`). The frontend uses the `formData.address` textarea value to update the patient's record on the backend.

## 3. Current User Session Data
- **Endpoint:** `GET /api/v1/auth/me`
- **Role:** Patient (and other roles)
- **Response Key:** `address` (Type: `string | undefined`)
- **Description:** When the user session is hydrated via `refreshProfile` in `AuthContext.tsx`, the `address` string from the backend's `result.data.address` is stored in the `User` object context, making it globally available.

> [!NOTE]
> The Book Appointment page reads from the `AuthContext` user object to check `user.address`. If it's missing, it prompts the user to visit their profile and fill it out. If it exists, it displays it inline before submission.
