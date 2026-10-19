# Booking rescheduling plan

## Goal

Users can change the date or time of their booking without cancelling it.
The booking keeps its ID, owner, resource, and creation date.

## Current project

The `dev` branch has sign-in, resource management, and a resource catalog.
It has no booking table, API, or page. This change includes the small booking
flow needed to create and then reschedule a booking.

## Design

- Store bookings in PostgreSQL through Prisma, linked to a user and resource.
- Add authenticated `GET /api/bookings`, `POST /api/bookings`, and
  `PATCH /api/bookings/:id` routes. Users only see and change their own bookings.
- Store start and end timestamps in UTC. Forms use campus time in Pakistan
  (UTC+5). A booking starts and ends on the same campus date.
- Room bookings must fit inside a configured daily booking window. Equipment
  bookings reserve one unit and must stay within the resource's quantity.
- Only future bookings can be changed. The new start must be in the future,
  and the end must be later than the start.
- Check availability and write the change in one serializable transaction.
  Retry transaction conflicts up to three times. Ignore the booking being
  changed when checking overlaps. A failed update keeps the old booking.
- Keep existing admin deletion actions working by removing linked bookings
  when their user or resource is deleted.
- Add a Book button to the catalog and a My bookings page with an inline,
  prefilled change form. Show clear save, error, loading, and empty states.

## Implementation

- [x] Add the Prisma Booking model and update the initial SQL setup.
- [x] Add shared booking validation and availability rules in
  `Server/lib/bookings.js`.
- [x] Add booking routes and mount them in `Server/index.js`.
- [x] Add tests using Node's built-in test runner. Cover ownership, invalid
  dates, past bookings, room windows, equipment capacity, adjacent times,
  failed updates, unchanged IDs, and competing requests.
- [x] Add `BookingForm.jsx`, `MyBookings.jsx`, and a small campus-time utility.
  Connect them to the catalog and app navigation, using the existing styles.
- [x] Document database setup, the API, and how to run the tests.
- [x] Run the server tests against a temporary local PostgreSQL database,
  validate the Prisma schema, and run the client lint and production build.
- [x] Check the create and change flows in the browser, including a conflict
  that leaves the original booking in place.
- [x] Review the diff, commit, and open a PR against `dev` with a short,
  plain-language description.

## Acceptance checks

1. Create a future booking and find it under My bookings.
2. Change only its date, only its time, or both. Refresh and see the saved time.
3. Keep the same booking ID, resource, owner, and creation date after saving.
4. Reject another user's update, past dates, invalid times, unavailable
   resources, and slots with no capacity. Keep the original booking on failure.
5. Allow a booking to keep its own slot and allow back-to-back bookings.
6. Prevent competing requests from reserving the last available place twice.
