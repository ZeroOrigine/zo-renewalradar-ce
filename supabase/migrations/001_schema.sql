-- ============================================================================
-- RenewalRadar CE — schema (product slug prefix: renewalradarce_)
-- Shared-database safe: every table, enum, function, trigger, index prefixed.
-- Applies top-to-bottom in one pass on a fresh Supabase project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE renewalradarce_profession AS ENUM ('real_estate', 'insurance');
CREATE TYPE renewalradarce_license_status AS ENUM ('active', 'expired', 'inactive');
CREATE TYPE renewalradarce_alert_status AS ENUM ('pending', 'sent', 'dismissed');
CREATE TYPE renewalradarce_subscription_status AS ENUM
  ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');
CREATE TYPE renewalradarce_payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE renewalradarce_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  timezone text NOT NULL DEFAULT 'America/New_York',
  email_alerts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public pricing catalog: prices live in the DB, never in env vars.
CREATE TABLE renewalradarce_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  billing_interval text CHECK (billing_interval IN ('month', 'year')),
  max_licenses integer CHECK (max_licenses IS NULL OR max_licenses > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public catalog of state CE rules. No user columns; writes via service role only.
CREATE TABLE renewalradarce_state_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  profession renewalradarce_profession NOT NULL,
  license_class text NOT NULL DEFAULT 'all',
  total_hours_required numeric(5,1) NOT NULL CHECK (total_hours_required >= 0),
  renewal_period_months integer NOT NULL CHECK (renewal_period_months > 0),
  category_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  renewal_basis text NOT NULL DEFAULT 'license_anniversary'
    CHECK (renewal_basis IN ('license_anniversary', 'fixed_date', 'birth_month')),
  fixed_renewal_month integer CHECK (fixed_renewal_month BETWEEN 1 AND 12),
  fixed_renewal_day integer CHECK (fixed_renewal_day BETWEEN 1 AND 31),
  carryover_allowed boolean NOT NULL DEFAULT false,
  carryover_max_hours numeric(5,1) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  source_url text NOT NULL,
  last_verified_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, profession, license_class)
);

CREATE TABLE renewalradarce_licenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'renewalradarce',
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  profession renewalradarce_profession NOT NULL,
  license_class text NOT NULL DEFAULT 'all',
  license_number text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  state_rule_id uuid REFERENCES renewalradarce_state_rules(id) ON DELETE SET NULL,
  status renewalradarce_license_status NOT NULL DEFAULT 'active',
  issued_on date,
  current_period_start date,
  renewal_deadline date NOT NULL,
  hours_required_override numeric(5,1) CHECK (hours_required_override IS NULL OR hours_required_override >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE renewalradarce_ce_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'renewalradarce',
  license_id uuid NOT NULL REFERENCES renewalradarce_licenses(id) ON DELETE CASCADE,
  course_name text NOT NULL CHECK (length(course_name) BETWEEN 1 AND 300),
  provider_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  hours numeric(5,2) NOT NULL CHECK (hours > 0 AND hours <= 100),
  completed_on date NOT NULL,
  certificate_url text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE renewalradarce_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'renewalradarce',
  license_id uuid NOT NULL REFERENCES renewalradarce_licenses(id) ON DELETE CASCADE,
  days_before integer NOT NULL CHECK (days_before >= 0),
  trigger_on date NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  status renewalradarce_alert_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_id, days_before, trigger_on)
);

CREATE TABLE renewalradarce_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'renewalradarce',
  plan_id uuid REFERENCES renewalradarce_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status renewalradarce_subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE renewalradarce_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'renewalradarce',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status renewalradarce_payment_status NOT NULL DEFAULT 'pending',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook idempotency ledger. RLS on, zero policies: service role only.
CREATE TABLE renewalradarce_stripe_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INDEXES (plain columns only; no volatile expressions)
-- ----------------------------------------------------------------------------
CREATE INDEX renewalradarce_licenses_user_id_idx ON renewalradarce_licenses (user_id);
CREATE INDEX renewalradarce_licenses_state_rule_id_idx ON renewalradarce_licenses (state_rule_id);
CREATE INDEX renewalradarce_licenses_renewal_deadline_idx ON renewalradarce_licenses (renewal_deadline);
CREATE INDEX renewalradarce_licenses_active_deadline_idx
  ON renewalradarce_licenses (user_id, renewal_deadline) WHERE status = 'active';

CREATE INDEX renewalradarce_ce_entries_user_id_idx ON renewalradarce_ce_entries (user_id);
CREATE INDEX renewalradarce_ce_entries_license_completed_idx
  ON renewalradarce_ce_entries (license_id, completed_on);

CREATE INDEX renewalradarce_alerts_user_id_idx ON renewalradarce_alerts (user_id);
CREATE INDEX renewalradarce_alerts_license_id_idx ON renewalradarce_alerts (license_id);
CREATE INDEX renewalradarce_alerts_pending_trigger_idx
  ON renewalradarce_alerts (trigger_on) WHERE status = 'pending';

CREATE INDEX renewalradarce_subscriptions_plan_id_idx ON renewalradarce_subscriptions (plan_id);
CREATE UNIQUE INDEX renewalradarce_subscriptions_stripe_sub_uidx
  ON renewalradarce_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX renewalradarce_subscriptions_active_period_idx
  ON renewalradarce_subscriptions (current_period_end) WHERE status IN ('active', 'trialing');

CREATE INDEX renewalradarce_payments_user_id_idx ON renewalradarce_payments (user_id);
CREATE UNIQUE INDEX renewalradarce_payments_intent_uidx
  ON renewalradarce_payments (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX renewalradarce_state_rules_lookup_idx
  ON renewalradarce_state_rules (state_code, profession);
CREATE INDEX renewalradarce_plans_active_sort_idx
  ON renewalradarce_plans (sort_order) WHERE is_active;

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.renewalradarce_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.renewalradarce_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.renewalradarce_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Regenerates pending countdown alerts (90/60/30/14/7/1 days out) whenever a
-- license is created or its deadline moves. SECURITY INVOKER: RLS still applies.
CREATE OR REPLACE FUNCTION public.renewalradarce_sync_license_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.renewalradarce_alerts
   WHERE license_id = NEW.id AND status = 'pending';

  INSERT INTO public.renewalradarce_alerts (user_id, license_id, days_before, trigger_on)
  SELECT NEW.user_id, NEW.id, d, (NEW.renewal_deadline - d)
    FROM unnest(ARRAY[90, 60, 30, 14, 7, 1]) AS d
   WHERE (NEW.renewal_deadline - d) >= CURRENT_DATE
  ON CONFLICT (license_id, days_before, trigger_on) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Hours logged inside the license's current CE period. SECURITY INVOKER: RLS applies.
CREATE OR REPLACE FUNCTION public.renewalradarce_license_period_hours(p_license_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(e.hours), 0)
    FROM public.renewalradarce_ce_entries e
    JOIN public.renewalradarce_licenses l ON l.id = e.license_id
   WHERE e.license_id = p_license_id
     AND (l.current_period_start IS NULL OR e.completed_on >= l.current_period_start)
     AND e.completed_on <= l.renewal_deadline;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS renewalradarce_on_auth_user_created ON auth.users;
CREATE TRIGGER renewalradarce_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_handle_new_user();

CREATE TRIGGER renewalradarce_licenses_sync_alerts
  AFTER INSERT OR UPDATE OF renewal_deadline ON renewalradarce_licenses
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_sync_license_alerts();

CREATE TRIGGER renewalradarce_profiles_touch
  BEFORE UPDATE ON renewalradarce_profiles
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_plans_touch
  BEFORE UPDATE ON renewalradarce_plans
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_state_rules_touch
  BEFORE UPDATE ON renewalradarce_state_rules
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_licenses_touch
  BEFORE UPDATE ON renewalradarce_licenses
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_ce_entries_touch
  BEFORE UPDATE ON renewalradarce_ce_entries
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_alerts_touch
  BEFORE UPDATE ON renewalradarce_alerts
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_subscriptions_touch
  BEFORE UPDATE ON renewalradarce_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_payments_touch
  BEFORE UPDATE ON renewalradarce_payments
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();
CREATE TRIGGER renewalradarce_stripe_events_touch
  BEFORE UPDATE ON renewalradarce_stripe_events
  FOR EACH ROW EXECUTE FUNCTION public.renewalradarce_set_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE renewalradarce_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_state_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_ce_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewalradarce_stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewalradarce_profiles_owner" ON renewalradarce_profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Public catalogs: exactly one anon-readable SELECT policy each; writes via service role.
CREATE POLICY "renewalradarce_plans_public_read" ON renewalradarce_plans
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "renewalradarce_state_rules_public_read" ON renewalradarce_state_rules
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "renewalradarce_licenses_owner" ON renewalradarce_licenses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'renewalradarce')
  WITH CHECK (user_id = auth.uid() AND product_id = 'renewalradarce');

CREATE POLICY "renewalradarce_ce_entries_owner" ON renewalradarce_ce_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'renewalradarce')
  WITH CHECK (user_id = auth.uid() AND product_id = 'renewalradarce');

CREATE POLICY "renewalradarce_alerts_owner" ON renewalradarce_alerts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'renewalradarce')
  WITH CHECK (user_id = auth.uid() AND product_id = 'renewalradarce');

-- Billing state is written only by the Stripe webhook (service role); owners read.
CREATE POLICY "renewalradarce_subscriptions_owner" ON renewalradarce_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'renewalradarce');

CREATE POLICY "renewalradarce_payments_owner" ON renewalradarce_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'renewalradarce');

-- ----------------------------------------------------------------------------
-- SEED DATA
-- ----------------------------------------------------------------------------

INSERT INTO renewalradarce_plans
  (code, name, description, price_cents, currency, billing_interval, max_licenses, features, is_active, sort_order)
VALUES
  ('free', 'Free',
   'Track up to 2 licenses with deadline countdowns and CE hour logging.',
   0, 'usd', NULL, 2,
   '["2 licenses", "State rule lookup", "CE hour tracker", "Renewal countdowns"]'::jsonb,
   true, 0),
  ('pro_monthly', 'Pro Monthly',
   'Unlimited licenses, email countdown alerts, and certificate uploads.',
   900, 'usd', 'month', NULL,
   '["Unlimited licenses", "Email countdown alerts", "Certificate uploads", "Category by category progress"]'::jsonb,
   true, 1),
  ('pro_annual', 'Pro Annual',
   'Everything in Pro Monthly, billed once a year.',
   8400, 'usd', 'year', NULL,
   '["Unlimited licenses", "Email countdown alerts", "Certificate uploads", "Category by category progress"]'::jsonb,
   true, 2);

INSERT INTO renewalradarce_state_rules
  (state_code, profession, license_class, total_hours_required, renewal_period_months,
   category_requirements, renewal_basis, fixed_renewal_month, fixed_renewal_day,
   notes, source_url, last_verified_on)
VALUES
  ('CA', 'real_estate', 'all', 45, 48,
   '[{"category": "ethics", "hours": 3}, {"category": "agency", "hours": 3}, {"category": "fair_housing", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '45 hours every 4 years. Mandatory subjects apply and differ slightly between salespersons and brokers. Confirm with the CA DRE.',
   'https://www.dre.ca.gov/Licensees/ContinuingEd.html', '2026-07-15'),
  ('TX', 'real_estate', 'all', 18, 24,
   '[{"category": "legal_update", "hours": 8}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '18 hours every 2 years including Legal Update I and II. Brokers add a 6 hour broker responsibility course. Confirm with TREC.',
   'https://www.trec.texas.gov/education/continuing-education-ce', '2026-07-15'),
  ('FL', 'real_estate', 'all', 14, 24,
   '[{"category": "core_law", "hours": 3}, {"category": "ethics", "hours": 3}]'::jsonb,
   'fixed_date', 3, 31,
   '14 hours every 2 years. Renewal falls on March 31 or September 30 depending on your license. Confirm with the FL DBPR.',
   'https://www.myfloridalicense.com/DBPR/real-estate-commission/', '2026-07-15'),
  ('NY', 'real_estate', 'all', 22.5, 24,
   '[{"category": "fair_housing", "hours": 3}, {"category": "agency", "hours": 2}, {"category": "ethics", "hours": 2.5}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '22.5 hours every 2 years with required fair housing, agency, and ethics content. Confirm with the NY DOS.',
   'https://dos.ny.gov/real-estate-salesperson', '2026-07-15'),
  ('CO', 'real_estate', 'all', 24, 36,
   '[{"category": "annual_commission_update", "hours": 12}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '24 hours every 3 years including the Annual Commission Update course each year. Confirm with CO DORA.',
   'https://dre.colorado.gov/division-programs/real-estate-broker/continuing-education', '2026-07-15'),
  ('GA', 'real_estate', 'all', 36, 48,
   '[{"category": "license_law", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '36 hours every 4 years including 3 hours of license law. Confirm with the GA Real Estate Commission.',
   'https://grec.state.ga.us/', '2026-07-15'),
  ('WA', 'real_estate', 'all', 30, 24,
   '[{"category": "core_curriculum", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '30 hours every 2 years including the 3 hour core curriculum. Confirm with the WA DOL.',
   'https://dol.wa.gov/professional-licenses/real-estate-brokers', '2026-07-15'),
  ('NC', 'real_estate', 'all', 8, 12,
   '[{"category": "update_course", "hours": 4}]'::jsonb,
   'fixed_date', 6, 30,
   '8 hours every year with the license year ending June 30. Confirm with the NC Real Estate Commission.',
   'https://www.ncrec.gov/', '2026-07-15'),
  ('TX', 'insurance', 'producer', 24, 24,
   '[{"category": "ethics", "hours": 2}]'::jsonb,
   'birth_month', NULL, NULL,
   '24 hours every 2 years including 2 hours of ethics. Expiration tracks your license period. Confirm with TDI.',
   'https://www.tdi.texas.gov/agent/agceinfo.html', '2026-07-15'),
  ('CA', 'insurance', 'producer', 24, 24,
   '[{"category": "ethics", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '24 hours every 2 years including 3 hours of ethics. Confirm with the CA Department of Insurance.',
   'https://www.insurance.ca.gov/0200-industry/0050-renew-license/0200-requirements/continuing-education.cfm', '2026-07-15'),
  ('FL', 'insurance', 'producer', 24, 24,
   '[{"category": "law_and_ethics_update", "hours": 4}]'::jsonb,
   'birth_month', NULL, NULL,
   '24 hours every 2 years including the 4 hour law and ethics update. Confirm with the FL Department of Financial Services.',
   'https://www.myfloridacfo.com/division/agents', '2026-07-15'),
  ('NY', 'insurance', 'producer', 15, 24,
   '[]'::jsonb,
   'license_anniversary', NULL, NULL,
   '15 hours every 2 years. Confirm with the NY Department of Financial Services.',
   'https://www.dfs.ny.gov/apps_and_licensing/agents_and_brokers', '2026-07-15'),
  ('IL', 'insurance', 'producer', 24, 24,
   '[{"category": "ethics", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '24 hours every 2 years including 3 hours of ethics. Confirm with the IL Department of Insurance.',
   'https://idoi.illinois.gov/', '2026-07-15'),
  ('PA', 'insurance', 'producer', 24, 24,
   '[{"category": "ethics", "hours": 3}]'::jsonb,
   'license_anniversary', NULL, NULL,
   '24 hours every 2 years including 3 hours of ethics. Confirm with the PA Insurance Department.',
   'https://www.insurance.pa.gov/', '2026-07-15');

-- Self-validation patches
-- ============================================================================
-- RenewalRadar CE — validation patch
-- ============================================================================

-- 1) Make the service-role-only posture of the ledger auditable. RLS is ENABLED
--    with ZERO policies on purpose: anon/authenticated are denied everything;
--    only the service role (webhooks, metric dedupe) touches this table.
COMMENT ON TABLE renewalradarce_stripe_events IS
  'Service-role only idempotency ledger for webhook + metric dedupe. RLS enabled with no policies by design (deny-all for anon/authenticated).';

-- 2) Truth fix: the app stores certificate LINKS (https URLs), not uploads.
UPDATE renewalradarce_plans
   SET features = '["Unlimited licenses", "Email countdown alerts", "Certificate links on every entry", "Category by category progress"]'::jsonb
 WHERE code IN ('pro_monthly', 'pro_annual');