# Implementation Plan: Calendar UI, Customer Phone Formatting, and Delete Fix

Based on your design screenshot and requests, here is the technical plan to fulfill the requirements.

## Proposed Changes

### 1. Month Calendar UI Revamp (Frontend)
We will completely restructure the [CalendarView](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/components/bookings/CalendarView.tsx#40-228) from a daily time-grid into a modern full-month calendar grid with a right-hand sidebar for upcoming events, matching your screenshot.

#### [MODIFY] [CalendarView.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/components/bookings/CalendarView.tsx)
- **Layout overhaul**: Implement a 2-column layout. The left column will house the visual Month Grid. The right column will hold the "Upcoming Events" sidebar.
- **Month Grid Logic**: Generate days for the selected month to render rows of 7 days (Mon-Sun).
- **Booking Badges**: Use the existing color palettes (Green/Purple/Pink/Lime) to render small pill-shaped event indicators directly on the day boxes in the grid.
- **Sidebar Elements**: Render a list grouped by "Today" and "Tomorrow" showing detailed cards for upcoming projects/bookings, including the clock/truck icons as specified in the mock.

#### [MODIFY] [Bookings.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Bookings.tsx)
- Ensure the date state passed down covers a full month view span rather than just a week.

---

### 2. CRM Phone Number Country Code Saving (Backend)
Currently, the system actively strips country codes (like `91`) from phone numbers to handle local numbers. We will update the normalizer to ensure standard E.164 formatting (with the `+` prefix).

#### [MODIFY] [phoneUtils.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/utils/phoneUtils.ts)
- Modify [normalizePhone()](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/utils/phoneUtils.ts#1-28):
  - If a 10-digit number is passed, prepend `+91` automatically.
  - If a 12-digit number starts with `91`, prepend `+` instead of stripping it.
  - Guarantee that Bolna processes call data with full `+CountryCode` format instead of local digits.

---

### 3. Fixing CRM Customer Delete (Backend)
Currently, deleting a customer via the frontend sets `isDeleted: true` in the MongoDB document (a "soft delete"). You've requested that it completely removes the document from the database.

#### [MODIFY] [crmRoutes.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/routes/crmRoutes.ts)
- Update the `DELETE /api/crm/:id` route.
- Replace `findOneAndUpdate({ ... }, { isDeleted: true })` with `findOneAndDelete({ ... })`.
- This ensures the row is completely obliterated from MongoDB so it physically cannot appear anymore.

## Verification Plan
1. **Frontend UI**: Check `/bookings` tab, confirm the month grid displays properly with the sidebar, and clicking a month advances correctly.
2. **Deletion**: Delete a test customer from `/customers` and verify they instantly vanish from the table.
3. **Country Code**: Process a mock Bolna webhook/sync call and verify the new Customer is created in the database with a strict `+91XXXXXXXXXX` prefix.
