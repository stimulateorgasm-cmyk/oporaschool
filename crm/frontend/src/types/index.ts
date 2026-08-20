export enum UserStatus {
  active = 'active',
  blocked = 'blocked',
  archived = 'archived',
}

export enum ClientStatus {
  active = 'active',
  paused = 'paused',
  completed = 'completed',
  archived = 'archived',
}

export enum ChildStatus {
  active = 'active',
  paused = 'paused',
  completed = 'completed',
  archived = 'archived',
}

export enum TeacherStatus {
  active = 'active',
  vacation = 'vacation',
  inactive = 'inactive',
  archived = 'archived',
}

export enum LessonStatus {
  scheduled = 'scheduled',
  completed = 'completed',
  absent = 'absent',
  cancelled = 'cancelled',
  moved = 'moved',
}

export enum AttendanceStatus {
  unknown = 'unknown',
  present = 'present',
  absent = 'absent',
  cancelled_by_client = 'cancelled_by_client',
  cancelled_by_center = 'cancelled_by_center',
}

export enum LessonPaymentStatus {
  unpaid = 'unpaid',
  paid = 'paid',
  partial = 'partial',
  covered_by_package = 'covered_by_package',
}

export enum LessonFormat {
  individual = 'individual',
  group = 'group',
}

export enum PaymentMethod {
  cash = 'cash',
  card = 'card',
  bank_transfer = 'bank_transfer',
  online = 'online',
  other = 'other',
}

export enum BalanceTransactionType {
  purchase = 'purchase',
  consumption = 'consumption',
  refund = 'refund',
  correction_plus = 'correction_plus',
  correction_minus = 'correction_minus',
  transfer_in = 'transfer_in',
  transfer_out = 'transfer_out',
  expire = 'expire',
}

export enum SalaryPaymentStatus {
  active = 'active',
  reversed = 'reversed',
}

export enum MessageStatus {
  created = 'created',
  queued = 'queued',
  sent = 'sent',
  delivered = 'delivered',
  failed = 'failed',
  cancelled = 'cancelled',
}

export enum MailingStatus {
  draft = 'draft',
  scheduled = 'scheduled',
  processing = 'processing',
  completed = 'completed',
  cancelled = 'cancelled',
  failed = 'failed',
}

// ---------------- AUTH & USER SCHEMAS ----------------
export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PermissionRead {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface RoleRead {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: PermissionRead[];
}

export interface UserRead {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  status: UserStatus;
  last_login_at?: string;
  created_at: string;
  roles: RoleRead[];
  teacher_id?: string;
}

export interface UserCreate {
  full_name: string;
  phone: string;
  email?: string;
  status?: UserStatus;
  password: string;
  role_codes: string[];
}

export interface LoginRequest {
  phone: string;
  password: string;
}

// ---------------- CLIENT & CHILD SCHEMAS ----------------
export interface ChildCreate {
  full_name: string;
  birth_date?: string;
  comment?: string;
  status?: ChildStatus;
}

export interface ChildUpdate {
  full_name?: string;
  birth_date?: string;
  comment?: string;
  status?: ChildStatus;
}

export interface ChildRead {
  id: string;
  parent_id: string;
  full_name: string;
  birth_date?: string;
  comment?: string;
  status: ChildStatus;
  created_at: string;
  active_subjects_count: number;
}

export interface ParentCreate {
  full_name: string;
  address?: string;
  phone: string;
  secondary_phone?: string;
  comment?: string;
  status?: ClientStatus;
  children?: ChildCreate[];
}

export interface ParentUpdate {
  full_name?: string;
  address?: string;
  phone?: string;
  secondary_phone?: string;
  comment?: string;
  status?: ClientStatus;
}

export interface ParentRead {
  id: string;
  full_name: string;
  address?: string;
  phone: string;
  secondary_phone?: string;
  comment?: string;
  status: ClientStatus;
  created_at: string;
  children: ChildRead[];
  total_balance_lessons: number;
}

// ---------------- ACADEMIC & TEACHER SCHEMAS ----------------
export interface SubjectRead {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface TeacherRateCreate {
  subject_id: string;
  lesson_format: LessonFormat;
  amount: number | string;
  valid_from?: string;
  valid_until?: string;
}

export interface TeacherRateRead {
  id: string;
  teacher_id: string;
  subject_id: string;
  subject_name?: string;
  lesson_format: LessonFormat;
  amount: number | string;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

export interface TeacherRead {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  start_date?: string;
  status: TeacherStatus;
  comment?: string;
  created_at: string;
  subjects: SubjectRead[];
  rates: TeacherRateRead[];
  total_accrued: number | string;
  total_paid: number | string;
  debt: number | string;
  overpayment: number | string;
}

export interface TeacherCreate {
  full_name: string;
  phone: string;
  start_date?: string;
  status?: TeacherStatus;
  comment?: string;
  user_id?: string;
  subject_ids: string[];
  initial_rates?: TeacherRateCreate[];
}

export interface ChildSubjectCreate {
  child_id: string;
  subject_id: string;
  teacher_id: string;
  lesson_format: LessonFormat;
  lesson_price: number | string;
  default_duration_minutes: number;
  start_date?: string;
  comment?: string;
}

export interface ChildSubjectRead {
  id: string;
  child_id: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  lesson_format: LessonFormat;
  lesson_price: number | string;
  default_duration_minutes: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  balance_lessons: number;
  completed_lessons: number;
}

// ---------------- SCHEDULE & ROOMS ----------------
export interface RoomRead {
  id: string;
  number: number;
  name: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
}

export interface RoomCreate {
  number: number;
  name: string;
  capacity?: number;
  is_active?: boolean;
}

export interface LessonCreate {
  child_subject_id: string;
  room_id: string;
  starts_at: string;
  ends_at: string;
  comment?: string;
}

export interface LessonMoveRequest {
  new_starts_at: string;
  new_ends_at: string;
  new_room_id?: string;
  reason?: string;
}

export interface LessonAttendanceRequest {
  attendance_status: AttendanceStatus;
  charge_absent?: boolean;
  comment?: string;
}

export interface LessonCancelRequest {
  reason?: string;
  refund_balance: boolean;
}

export interface LessonHistoryRead {
  id: string;
  change_type: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  reason?: string;
  created_at: string;
  changed_by_name?: string;
}

export interface LessonRead {
  id: string;
  child_subject_id: string;
  child_id: string;
  child_name: string;
  parent_id?: string;
  parent_name?: string;
  parent_phone?: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  room_id: string;
  room_name: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  attendance_status: AttendanceStatus;
  payment_status: LessonPaymentStatus;
  lesson_format: LessonFormat;
  client_price: number | string;
  teacher_rate_snapshot?: number | string;
  comment?: string;
  created_at: string;
  history: LessonHistoryRead[];
}

// ---------------- FINANCE & BALANCE ----------------
export interface PaymentCreate {
  parent_id: string;
  child_id: string;
  child_subject_id: string;
  amount: number | string;
  payment_method: PaymentMethod;
  lessons_count: number;
  comment?: string;
}

export interface PaymentRead {
  id: string;
  parent_id: string;
  parent_name?: string;
  child_id: string;
  child_name?: string;
  subject_id?: string;
  subject_name?: string;
  amount: number | string;
  payment_date: string;
  payment_method: PaymentMethod;
  lessons_count?: number;
  price_per_lesson?: number | string;
  comment?: string;
  is_reversed: boolean;
  created_at: string;
}

export interface BalanceTransactionRead {
  id: string;
  child_id: string;
  child_subject_id: string;
  subject_id: string;
  subject_name?: string;
  package_id?: string;
  lesson_id?: string;
  payment_id?: string;
  transaction_type: BalanceTransactionType;
  quantity: number;
  comment?: string;
  created_at: string;
  created_by_name?: string;
}

export interface BalanceCorrectionRequest {
  child_id: string;
  child_subject_id: string;
  quantity: number;
  reason: string;
  comment?: string;
}

export interface BalanceReportItem {
  child_id: string;
  child_name: string;
  parent_id?: string;
  parent_name: string;
  parent_phone: string;
  child_subject_id: string;
  subject_name: string;
  teacher_name: string;
  balance_lessons: number;
  completed_lessons: number;
  is_low_balance: boolean;
}

export interface SubjectBalanceSummary {
  child_subject_id: string;
  subject_id: string;
  subject_name: string;
  teacher_name: string;
  total_purchased: number;
  total_consumed: number;
  remaining_balance: number;
  low_balance_warning: boolean;
  transactions: BalanceTransactionRead[];
}

export interface TeacherSalaryAccrualRead {
  id: string;
  teacher_id: string;
  lesson_id: string;
  lesson_date?: string;
  subject_name?: string;
  amount: number | string;
  accrued_at: string;
  is_reversed: boolean;
  reversal_reason?: string;
}

export interface TeacherSalaryPaymentCreate {
  teacher_id: string;
  amount: number | string;
  payment_method: PaymentMethod;
  period_from?: string;
  period_to?: string;
  comment?: string;
}

export interface TeacherSalaryPaymentRead {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  amount: number | string;
  payment_date: string;
  period_from?: string;
  period_to?: string;
  payment_method: PaymentMethod;
  status: SalaryPaymentStatus;
  comment?: string;
  created_at: string;
}

export interface TeacherSalarySummary {
  teacher_id: string;
  teacher_name: string;
  total_accrued: number | string;
  total_paid: number | string;
  debt: number | string;
  overpayment: number | string;
  accruals: TeacherSalaryAccrualRead[];
  payments: TeacherSalaryPaymentRead[];
}

// ---------------- SYSTEM & DASHBOARD ----------------
export interface DashboardMetrics {
  total_clients: number;
  active_children: number;
  lessons_today: number;
  lessons_completed_month: number;
  revenue_month: number;
  salary_accrued_month: number;
  salary_paid_month: number;
  total_teacher_debt: number;
  total_teacher_overpayment: number;
  free_rooms_now: number;
  zero_balance_children_count: number;
  low_balance_children_count: number;
}

export interface AuditLogRead {
  id: string;
  user_id?: string;
  user_name?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface SettingRead {
  id: string;
  key: string;
  value: Record<string, any>;
  description?: string;
  updated_at: string;
}
