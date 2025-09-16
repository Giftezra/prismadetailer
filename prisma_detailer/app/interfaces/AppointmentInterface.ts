// Calendar and Day View Interfaces
export interface CalendarDayProps {
  date: string;
  day: number;
  month: number;
  year: number;
  hasAppointments: boolean;
  appointmentCount: number;
  isToday: boolean;
  isSelected: boolean;
}

export interface TimeSlotProps {
  id: string;
  time: string; // Format: "09:00", "10:00", etc.
  hour: number;
  hasJob: boolean;
  job?: JobCardProps;
  isOccupiedByPreviousJob?: boolean;
  slotsToOccupy?: number;
}

export interface JobCardProps {
  id: number;
  booking_reference: string;
  service_type: string;
  client_name: string;
  valet_type: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  status: JobStatus;
}

export interface JobDetailsProps {
  id: string;
  booking_reference: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_color: string;
  vehicle_license: string;
  service_type: ServiceTypeProps;
  address: string;
  city: string;
  post_code: string;
  country: string;
  latitude: number;
  longitude: number;
  appointment_date: string;
  appointment_time: string;
  duration: number; // in minutes
  status: JobStatus;
  created_at: string;
  updated_at: string;
  specialInstruction?: string;
  valetType?: string;
  addons?: string[];
  before_images?: string;
  after_images?: string;
  loyalty_tier?: string;
  loyalty_benefits?: string[];
}

// Service Type Details
export interface ServiceTypeProps {
  id?: string;
  name: string;
  description: string[];
  duration: number; // in minutes
  price: number;
}

// Job Status Enum
export type JobStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

// Availability Interface (for blocking time slots)
export interface AvailabilityProps {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_blocked: boolean;
}
