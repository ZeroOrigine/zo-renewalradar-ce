// CANONICAL shared TypeScript types for RenewalRadar CE data services and API routes.

export type Profession = 'real_estate' | 'insurance';
export type LicenseStatus = 'active' | 'expired' | 'inactive';
export type AlertStatus = 'pending' | 'sent' | 'dismissed';
export type AlertChannel = 'email' | 'in_app';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface CategoryRequirement {
  category: string;
  hours: number;
}

export interface StateRule {
  id: string;
  state_code: string;
  profession: Profession;
  license_class: string;
  total_hours_required: number;
  renewal_period_months: number;
  category_requirements: CategoryRequirement[];
  renewal_basis: 'license_anniversary' | 'fixed_date' | 'birth_month';
  fixed_renewal_month: number | null;
  fixed_renewal_day: number | null;
  carryover_allowed: boolean;
  carryover_max_hours: number;
  notes: string;
  source_url: string;
  last_verified_on: string;
}

export interface License {
  id: string;
  user_id: string;
  state_code: string;
  profession: Profession;
  license_class: string;
  license_number: string;
  label: string;
  state_rule_id: string | null;
  status: LicenseStatus;
  issued_on: string | null;
  current_period_start: string | null;
  renewal_deadline: string;
  hours_required_override: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  state_rule: StateRule | null;
}

export interface CategoryProgress {
  category: string;
  hours_required: number;
  hours_completed: number;
  hours_remaining: number;
}

export interface LicenseProgress {
  hours_required: number | null;
  hours_completed: number;
  hours_remaining: number | null;
  percent_complete: number | null;
  days_until_renewal: number;
  entries_in_period: number;
  category_progress: CategoryProgress[];
}

export interface LicenseWithProgress extends License {
  progress: LicenseProgress;
}

export interface CeEntry {
  id: string;
  user_id: string;
  license_id: string;
  course_name: string;
  provider_name: string;
  category: string;
  hours: number;
  completed_on: string;
  certificate_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AlertLicenseSummary {
  id: string;
  label: string;
  state_code: string;
  profession: Profession;
  license_class: string;
  renewal_deadline: string;
  status: LicenseStatus;
}

export interface Alert {
  id: string;
  user_id: string;
  license_id: string;
  days_before: number;
  trigger_on: string;
  channel: AlertChannel;
  status: AlertStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  license: AlertLicenseSummary | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  billing_interval: 'month' | 'year' | null;
  max_licenses: number | null;
  features: string[];
  sort_order: number;
}

export interface Entitlement {
  plan_code: string;
  plan_name: string;
  max_licenses: number | null;
  subscription_status: SubscriptionStatus | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  role: 'user' | 'admin';
  timezone: string;
  email_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}
