export interface HiringCycle {
  id: string;
  total_vacancies: number;
  is_active: boolean;
  created_at: string;
  ended_at?: string;
  cycle_name: string;
  archived: boolean;
}

export interface Applicant {
  id: string;
  hiring_cycle_id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  experience_years: number;
  vehicle_type: string;
  additional_info?: string;
  status: "pending" | "approved" | "rejected";
  joining_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationFormData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  experience_years: number;
  vehicle_type: string;
  additional_info?: string;
  joining_date?: string;
}

export interface HiringStats {
  total_vacancies: number;
  filled_positions: number;
  remaining_positions: number;
  total_applications: number;
}

export interface ApplicantDetails {
  applicant: Applicant;
  hiring_cycle: HiringCycle;
}
