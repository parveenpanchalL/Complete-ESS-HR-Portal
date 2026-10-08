-- ESS HR Portal schema (PostgreSQL). Safe to re-run: uses IF NOT EXISTS.
CREATE OR REPLACE FUNCTION now_txt() RETURNS text AS $$
  SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE','HR')),
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  joining_date TEXT NOT NULL,
  phone TEXT,
  manager_id TEXT REFERENCES employees(id),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT DEFAULT now_txt(),
  updated_at TEXT DEFAULT now_txt()
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  in_time TEXT,
  out_time TEXT,
  working_hours DOUBLE PRECISION,
  status TEXT NOT NULL CHECK (status IN ('PRESENT','ABSENT','LEAVE','HOLIDAY','WEEKLY_OFF','HALF_DAY','LATE','MISSING_PUNCH')),
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TEXT DEFAULT now_txt(),
  updated_at TEXT DEFAULT now_txt(),
  UNIQUE (employee_db_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);

CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_allocation DOUBLE PRECISION NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  allocated DOUBLE PRECISION NOT NULL,
  used DOUBLE PRECISION NOT NULL DEFAULT 0,
  remaining DOUBLE PRECISION NOT NULL,
  UNIQUE (employee_db_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  attachment TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  approved_by_id TEXT REFERENCES employees(id),
  created_at TEXT DEFAULT now_txt(),
  updated_at TEXT DEFAULT now_txt()
);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status);

CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT
);

CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_at TEXT DEFAULT now_txt(),
  UNIQUE (employee_db_id, month, year)
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  attendance_id TEXT,
  date TEXT NOT NULL,
  previous_in_time TEXT,
  previous_out_time TEXT,
  previous_status TEXT,
  requested_in_time TEXT,
  requested_out_time TEXT,
  reason TEXT NOT NULL,
  attachment TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  approved_by_id TEXT REFERENCES employees(id),
  created_at TEXT DEFAULT now_txt(),
  updated_at TEXT DEFAULT now_txt()
);
CREATE INDEX IF NOT EXISTS corrections_status_idx ON attendance_corrections(status);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  employee_db_id TEXT NOT NULL REFERENCES employees(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT DEFAULT now_txt()
);
CREATE INDEX IF NOT EXISTS notifications_emp_idx ON notifications(employee_db_id, read_status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES employees(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_data TEXT,
  new_data TEXT,
  created_at TEXT DEFAULT now_txt()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS attendance_imports (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_by_id TEXT NOT NULL REFERENCES employees(id),
  total_records INTEGER NOT NULL,
  success_records INTEGER NOT NULL,
  failed_records INTEGER NOT NULL,
  created_at TEXT DEFAULT now_txt()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts(identifier, at);
