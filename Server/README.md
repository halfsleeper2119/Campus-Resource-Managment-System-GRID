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
