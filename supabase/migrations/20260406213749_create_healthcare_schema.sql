/*
  # E-Healthcare Database Schema

  ## Overview
  Complete database schema for a modern E-Healthcare application with role-based access control,
  biometric authentication support, medical records management, and comprehensive audit logging.

  ## 1. New Tables

  ### users
  Core user table supporting multiple roles (patient, doctor, nurse, admin)
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique, not null) - User email address
  - `password_hash` (text) - Hashed password (nullable for biometric-only users)
  - `role` (text, not null) - User role: patient, doctor, nurse, admin
  - `name` (text, not null) - Full name
  - `phone` (text) - Contact phone number
  - `two_factor_enabled` (boolean, default false) - 2FA activation status
  - `two_factor_secret` (text) - TOTP secret for 2FA
  - `email_verified` (boolean, default false) - Email verification status
  - `is_active` (boolean, default true) - Account active status
  - `created_by` (uuid) - Reference to admin who created this user (for doctors/nurses)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### biometric_auth
  Stores biometric verification metadata (hashes, not raw biometric data)
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `face_hash` (text) - Hash/fingerprint of face biometric template
  - `iris_hash` (text) - Hash/fingerprint of iris biometric template
  - `fingerprint_hash` (text) - Hash/fingerprint of fingerprint biometric template
  - `face_verified` (boolean, default false) - Face verification status
  - `iris_verified` (boolean, default false) - Iris verification status
  - `fingerprint_verified` (boolean, default false) - Fingerprint verification status
  - `verified_at` (timestamptz) - Timestamp of successful verification
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### medical_records
  Patient medical records and documents
  - `id` (uuid, primary key) - Unique record identifier
  - `patient_id` (uuid, foreign key) - Reference to patient user
  - `file_url` (text, not null) - URL to stored medical file
  - `file_name` (text, not null) - Original filename
  - `file_type` (text) - MIME type
  - `file_size` (integer) - File size in bytes
  - `description` (text) - Record description
  - `record_type` (text) - Type: lab_result, prescription, imaging, diagnosis, etc.
  - `record_date` (date) - Date of medical record
  - `uploaded_by` (uuid) - User who uploaded the record
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### access_grants
  Manages temporary access for doctors/nurses to patient records
  - `id` (uuid, primary key) - Unique grant identifier
  - `patient_id` (uuid, foreign key, not null) - Patient granting access
  - `granted_to_id` (uuid, foreign key) - Doctor or nurse receiving access
  - `access_type` (text, not null) - Type: magic_link, otp, direct
  - `token` (text, unique) - Magic link token
  - `otp` (text) - One-time password
  - `status` (text, default 'pending') - Status: pending, active, expired, revoked
  - `expires_at` (timestamptz, not null) - Expiration timestamp
  - `used_at` (timestamptz) - Timestamp when grant was used
  - `created_at` (timestamptz) - Grant creation timestamp

  ### audit_logs
  Comprehensive audit trail for all system actions
  - `id` (uuid, primary key) - Unique log identifier
  - `user_id` (uuid) - User performing the action
  - `action` (text, not null) - Action performed: login, view_record, grant_access, etc.
  - `resource_type` (text) - Type of resource: user, medical_record, access_grant
  - `resource_id` (uuid) - ID of affected resource
  - `details` (jsonb) - Additional action details
  - `ip_address` (text) - Client IP address
  - `user_agent` (text) - Client user agent
  - `timestamp` (timestamptz, default now()) - Action timestamp

  ### sessions
  User session management
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (uuid, foreign key, not null) - User owning the session
  - `token` (text, unique, not null) - Session token
  - `expires_at` (timestamptz, not null) - Session expiration
  - `created_at` (timestamptz, default now()) - Session creation timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Create policies for role-based access control
  - Restrict sensitive operations to appropriate roles
  - Ensure patients can only access their own data
  - Ensure doctors/nurses can only access granted patient data

  ## 3. Important Notes
  - All biometric data stored as hashes/metadata only
  - No raw biometric images stored in database
  - Access grants automatically expire based on expires_at
  - Comprehensive audit logging for compliance
  - Support for multiple authentication methods
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'nurse', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE access_grant_status AS ENUM ('pending', 'active', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  role user_role NOT NULL DEFAULT 'patient',
  name text NOT NULL,
  phone text,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  email_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Biometric authentication table
CREATE TABLE IF NOT EXISTS biometric_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  face_hash text,
  iris_hash text,
  fingerprint_hash text,
  face_verified boolean DEFAULT false,
  iris_verified boolean DEFAULT false,
  fingerprint_verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  description text,
  record_type text,
  record_date date,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Access grants table
CREATE TABLE IF NOT EXISTS access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  granted_to_id uuid REFERENCES users(id) ON DELETE CASCADE,
  access_type text NOT NULL,
  token text UNIQUE,
  otp text,
  status access_grant_status DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_biometric_user_id ON biometric_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_patient ON access_grants(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_granted_to ON access_grants(granted_to_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_token ON access_grants(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR role = 'admin');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can create doctors and nurses"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR role = 'patient'
  );

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for biometric_auth table
CREATE POLICY "Users can view own biometric data"
  ON biometric_auth FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own biometric data"
  ON biometric_auth FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own biometric data"
  ON biometric_auth FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for medical_records table
CREATE POLICY "Patients can view own records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM access_grants
      WHERE access_grants.patient_id = medical_records.patient_id
      AND access_grants.granted_to_id = auth.uid()
      AND access_grants.status = 'active'
      AND access_grants.expires_at > now()
    )
  );

CREATE POLICY "Patients can insert own records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own records"
  ON medical_records FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());

-- RLS Policies for access_grants table
CREATE POLICY "Patients can view own grants"
  ON access_grants FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR granted_to_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Patients can create access grants"
  ON access_grants FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own grants"
  ON access_grants FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own grants"
  ON access_grants FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());

-- RLS Policies for audit_logs table
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "All authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for sessions table
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_auth_updated_at BEFORE UPDATE ON biometric_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();