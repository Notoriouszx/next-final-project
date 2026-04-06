export type UserRole = "patient" | "doctor" | "nurse" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  two_factor_enabled: boolean;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BiometricAuth {
  id: string;
  user_id: string;
  face_hash?: string | null;
  iris_hash?: string | null;
  fingerprint_hash?: string | null;
  face_verified: boolean;
  iris_verified: boolean;
  fingerprint_verified: boolean;
  verified_at?: string | null;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
  description?: string | null;
  created_at: string;
}

export interface AccessGrant {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  nurse_id?: string | null;
  token?: string | null;
  otp?: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  timestamp: string;
}
