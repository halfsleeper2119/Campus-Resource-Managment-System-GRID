# Server

## Configure and run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL
   database. Set `JWT_SECRET` to a private random value of at least 32 bytes
   (for example, generate one with `openssl rand -base64 32`).
3. Generate the Prisma client and create/update the database tables:

   ```sh
   npm run db:generate
   npm run db:push
   ```

4. Create the first administrator. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and
   `ADMIN_PASSWORD` in the server environment; the password must be at least
   12 characters and no more than 72 UTF-8 bytes. Then run:

   ```sh
   npm run create-admin
   ```

   The bootstrap command refuses to create another admin if one already
   exists. Keep the bootstrap password out of source control and unset it after
   use.
5. Start the API with `npm run dev` (or `npm start`). It listens on port 5000
   by default.

## Authentication

`POST /api/auth/login` accepts `{ "accountType": "student", "rollNumber":
"22L-1234", "password": "..." }` for students or `{ "accountType": "faculty",
"email": "name@university.edu", "password": "..." }` for faculty and admins.
On success it returns a one-hour bearer token and a public user profile.

Administrators can provision faculty or student accounts with
`POST /api/auth/users`, authenticated with an admin bearer token. Student
accounts require a roll number; faculty accounts require an email address.
Passwords are stored as bcrypt hashes, not plaintext. There is no public
signup endpoint. For example, an administrator can create a student with:

```sh
curl -X POST http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Student","role":"STUDENT","rollNumber":"22L-1234","password":"replace-with-a-temporary-password"}'
```

All resource API requests require a bearer token. Only administrators can
create, update, or delete resources. The frontend keeps the token in memory and
requires users to sign in again after reloading the page.
