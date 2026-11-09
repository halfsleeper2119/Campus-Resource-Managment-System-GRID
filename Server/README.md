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

To send booking confirmation and cancellation notifications, configure
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM`. Set `SMTP_USER` and
`SMTP_PASSWORD` when the SMTP server requires authentication. The sender address
in `SMTP_FROM` must be authorized by your email provider. If SMTP is not
configured or delivery fails, the booking still succeeds and the user is told
that the notification could not be sent.

## 2. Create tables and the initial admin

The API uses the PostgreSQL database configured by `DATABASE_URL` for users,
resources, and bookings. Run the schema sync whenever the Prisma schema changes;
this includes creating the `Booking` table for booking support.

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
