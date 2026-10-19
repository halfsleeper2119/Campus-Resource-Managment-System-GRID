# Run the project

## 1. Configure the server

```sh
cd Server
npm install
cp -n .env.example .env
```

Edit `Server/.env`. Set `DATABASE_URL` to the Aiven PostgreSQL connection URL
with `sslmode=verify-full` and the URL-encoded path to Aiven's CA certificate.
Set `JWT_SECRET` to the output of:

```sh
node -p "require('crypto').randomBytes(32).toString('base64')"
```

Add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to `.env` for the initial
admin. The password must be 6–72 UTF-8 bytes.

## 2. Create tables and the initial admin

Run from `Server`:

```sh
npm run db:generate
npm run db:push
npm run create-admin
```

After the admin is created, remove `ADMIN_NAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD` from `.env`.

## 3. Start the server

Run from `Server`:

```sh
npm run dev
```

## 4. Start the client

In a second terminal, from the project root:

```sh
cd Client
npm install
npm run dev
```

Open the local URL printed by Vite. Keep `.env` and database credentials
private. The API listens on port 5001 by default.

## Bookings

From the resource catalog, choose **Book resource** and enter a date and time.
Open **My bookings** and choose **Change date or time** to update a future
booking. The form starts with the current date and time. **Keep current
booking** closes the form without saving.

All booking times use campus time in Pakistan (UTC+5). Rooms must be booked
inside one of their daily booking windows. Equipment bookings reserve one
unit. Fully booked times and unavailable resources cannot be booked.
If a change fails, the original booking stays in place.

For an existing database, run `npm run db:generate` and `npm run db:push`
before starting the updated server. This adds the Booking table. The initial
SQL script also includes this table for new databases. Deleting a user or
resource removes its linked bookings.

The API uses the same Bearer token as the rest of the app:

- `GET /api/bookings` lists the signed-in user's bookings.
- `POST /api/bookings` takes `resourceId`, `date` (`YYYY-MM-DD`), `startTime`,
  and `endTime` (`HH:mm`).
- `PATCH /api/bookings/:id` takes `date`, `startTime`, and `endTime`. It updates
  only the signed-in user's future booking and keeps its ID and resource.

Bookings start and end on the same campus date. Availability is checked and
saved in one transaction. Times that touch at their start or end do not
overlap.

## Tests

Run `npm test` from `Server` for the validation tests. API tests run when
`TEST_DATABASE_URL` points to a separate PostgreSQL test database with the
current schema. The tests create and remove their own users and resources.

Example in PowerShell, using a local test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres@localhost:55439/campus_bookings'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:generate
npm run db:push
npm test
```

The API tests cover ownership, saved dates, invalid changes, equipment
capacity, and competing requests for the same time.

Run `npm run lint` and `npm run build` from `Client` to check the frontend.
