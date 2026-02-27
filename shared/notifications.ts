export type NotificationType =
  | "appointment_created"
  | "visit_created"
  | "lab_test_created"
  | "bill_with_medicines_created"
  | "sample_collection_created"
  | "generic";

export type NotificationAudience =
  | "doctor"
  | "pharmacist"
  | "receptionist"
  | "lab_technologist"
  | "manager"
  | "admin"
  | "staff"
  | "all";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  audience: NotificationAudience;
  createdAt: string;
  /** Optional doctor name when the event is for a specific doctor (match against logged-in doctor fullName). */
  doctorName?: string | null;
  /** Optional extra data for deep-linking or debugging on the client. */
  data?: Record<string, unknown>;
}

