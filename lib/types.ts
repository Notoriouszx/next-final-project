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
  face_hash?: string;
  iris_hash?: string;
  fingerprint_hash?: string;
  face_verified: boolean;
  iris_verified: boolean;
  fingerprint_verified: boolean;
  verified_at?: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  description?: string;
  record_type?: string;
  record_date?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface AccessGrant {
  id: string;
  patient_id: string;
  granted_to_id?: string;
  access_type: "magic_link" | "otp" | "direct";
  token?: string;
  otp?: string;
  status: "pending" | "active" | "expired" | "revoked";
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}
