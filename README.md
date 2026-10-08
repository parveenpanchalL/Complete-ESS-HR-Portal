# ESS HR Portal

Employee Self-Service HR app. Next.js 14 (App Router) + TypeScript + Tailwind.
Database: PostgreSQL (built for Supabase, works with any Postgres). Sessions: JWT in an
httpOnly cookie, signed with `jose` (edge-compatible, works in Vercel middleware).

## Deploy (Vercel + Supabase)

1. **Create a Supabase project.** Under Project Settings -> Database -> Connection pooling,
   copy the **pooled** connection string (port 6543, "Transaction" mode).
2. **Set environment variables** (in Vercel's dashboard, or a local `.env` for testing --
   copy `.env.example` to `.env` and fill it in):
   - `DATABASE_URL` -- the pooled connection string from step 1
   - `JWT_SECRET` -- 32+ random characters, e.g. `openssl rand -base64 48`
   - `APP_TIMEZONE` -- IANA timezone used for "today", e.g. `Asia/Kolkata`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10+ chars), `ADMIN_NAME` -- only read once, to create
     the first HR admin
3. **Create the schema and first admin** (run once, from your machine, pointed at the
   production `DATABASE_URL`):

       npm install
       npm run db:init

   Safe to re-run -- only creates what's missing, never touches existing data. Refuses to
   create a second admin if one already exists.
4. **Deploy to Vercel** (connect the repo, or `vercel --prod`). Set the env vars from step 2
   in the Vercel project first.
5. **Log in** at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. You'll be forced to
   set a new password immediately (`must_change_password` is set on the bootstrap admin).

### Optional: load demo data

For a staging/demo environment only -- **this deletes all existing data**:

    CONFIRM_DEMO_SEED=yes npm run db:seed-demo

Creates 1 HR admin + 24 employees, ~1,000 attendance rows, sample leave/correction
requests. Password for every demo account: `Demo@12345` (each is forced to change it at
first login). Refuses to run if `NODE_ENV=production` unless you also set
`ALLOW_DEMO_SEED_IN_PROD=yes` -- don't set that on a real deployment.

## Local development

    cp .env.example .env     # fill in a local/dev DATABASE_URL and JWT_SECRET
    npm install
    npm run db:init           # creates schema + first admin
    npm run db:seed-demo       # optional: CONFIRM_DEMO_SEED=yes npm run db:seed-demo
    npm run dev                # http://localhost:3000

## What's implemented

**Auth & security:** bcrypt password hashing, JWT session cookies (httpOnly, signed with
`jose`), edge middleware that gates every protected route by role, login lockout (5 failed
attempts / 15 min per identifier, timing-safe against username enumeration), forced password
change for new/reset accounts, change-password flow, role re-checked from the DB on every
request (not just trusted from the cookie), security headers (HSTS, X-Frame-Options, etc).

**HR:** dashboard stats (falls back to the last imported day if nothing's been uploaded
today yet), employee add/edit/deactivate/reset-password (temp passwords shown once, never
logged), attendance Excel/CSV upload -> validation preview -> confirm import (batched inserts,
re-validated server-side -- never trusts what the browser posts back) -> error report ->
import history; approved corrections/leave are never silently overwritten by a later
biometric import. Leave and correction approvals run in DB transactions with row locking
(no double-approval, no race on balance deduction). Leave balance editing, holidays, payslip
upload (single + bulk, 2 MB/file limit, PDF/PNG/JPG only), announcements, reports (attendance,
leave, monthly summary) with CSV export (formula-injection safe), and a full audit log page.

**Employee:** dashboard, attendance by month with a calendar (holidays/weekly-offs shown even
without an uploaded row), correction requests, leave apply/cancel with real balance + overlap
checks, payslip download (own only -- same 404 for "missing" and "someone else's", so IDs
can't be probed), profile, notifications with unread count.

## Known gaps

- No attachment upload on leave/correction requests (the fields exist; no UI yet)
- Employees can't edit their own profile (view-only)
- Holidays don't get written as `attendance` rows ahead of time -- they're derived on the fly
  for the calendar view, which is correct for display but means a holiday report pulled by
  `status = 'HOLIDAY'` only shows holidays that fell on a day someone also had attendance
  uploaded for. Fine for now; worth revisiting if holiday reporting becomes important.
- CSV export only (no native .xlsx export)
- No automated test suite is checked in. I wrote and ran one during development
  (17 cases covering auth, lockout, leave/correction approval transactions, and
  attendance-import validation -- all passing) but removed it from the final delivery since
  it truncates all data and isn't meant to be run against a real database by accident.
- Payslips are stored as base64 in Postgres. Fine at this scale; move to Supabase Storage
  or S3 if payslip volume grows large.
