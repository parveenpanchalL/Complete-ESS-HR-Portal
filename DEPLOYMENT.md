# ESS HR Portal — Production Deployment Guide

This guide walks you through deploying the **ESS HR Portal** to **Supabase** (PostgreSQL) and **Vercel** (Next.js hosting) in under 10 minutes.

---

## 1. Prerequisites

- A **GitHub** account
- A **Supabase** account ([supabase.com](https://supabase.com))
- A **Vercel** account ([vercel.com](https://vercel.com))
- **Node.js 20+** installed locally

---

## 2. Step 1: Set Up Supabase Database

1. Log into [supabase.com](https://supabase.com) and click **New project**.
2. Choose a project name, secure database password, and your preferred region (e.g. `ap-south-1` for India).
3. Once the project is created, navigate to:
   - **Project Settings** (gear icon) → **Database** → **Connection string**.
4. Select the **URI** tab, choose **Transaction** mode (or port `6543`), and copy the connection string:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   > **Note on Special Characters**: If your database password contains characters like `@`, `#`, or `!`, make sure they are URL-encoded (e.g. `#` → `%23`, `@` → `%40`) so the connection string parses properly.

---

## 3. Step 2: Initialize Database Schema

On your local machine inside this folder:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase connection and initial HR admin credentials:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   JWT_SECRET="generate_32_or_more_random_characters_here"
   APP_TIMEZONE="Asia/Kolkata"
   ADMIN_EMAIL="hr@yourcompany.com"
   ADMIN_PASSWORD="YourStrongInitialPassword123"
   ADMIN_NAME="HR Administrator"
   ```
   *(To generate a strong JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)*

3. Run the database migration script:
   ```bash
   npm run db:init
   ```
   This will:
   - Create all tables: `employees`, `attendance`, `leave_types`, `leave_balances`, `leave_requests`, `holidays`, `payslips`, `attendance_corrections`, `notifications`, `audit_logs`, `attendance_imports`, `login_attempts`.
   - Seed default leave types (Casual Leave `CL`, Sick Leave `SL`, Earned Leave `EL`).
   - Create the first HR administrator account.

*(Optional)* If deploying a staging/demo environment with sample records:
```bash
CONFIRM_DEMO_SEED=yes npm run db:seed-demo
```
*(Do NOT run `db:seed-demo` on a production database with live data).*

---

## 4. Step 3: Push to GitHub

1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of ESS HR Portal"
   ```
   *(Note: `.gitignore` automatically prevents `.env`, `node_modules`, and `.next` from being uploaded).*

2. Create a new repository on GitHub and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## 5. Step 4: Deploy to Vercel

1. Log into [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Select and import your GitHub repository.
3. Keep Framework Preset as **Next.js**.
4. Expand **Environment Variables** and add the following:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres...:6543/postgres` | Your Supabase pooled connection string |
   | `JWT_SECRET` | `your_long_random_secret` | 32+ characters secret for session tokens |
   | `APP_TIMEZONE` | `Asia/Kolkata` | IANA timezone name for company date calculation |

5. Click **Deploy**. Vercel will install dependencies and produce an optimized production build in ~1 minute.

---

## 6. Step 5: First Login & Verification

1. Go to your Vercel deployment URL: `https://your-app.vercel.app/admin/login`
2. Log in with the initial HR credentials you set:
   - **Email**: `ADMIN_EMAIL` (e.g. `hr@yourcompany.com`)
   - **Password**: `ADMIN_PASSWORD`
3. You will be prompted to change your password immediately upon first login.
4. You can now:
   - Add employees under **Employees → Add Employee**
   - Bulk upload biometric attendance via Excel / CSV under **Attendance → Upload Attendance**
   - Track live punches, leaves, corrections, holidays, and export Excel (`.xlsx`) reports!
