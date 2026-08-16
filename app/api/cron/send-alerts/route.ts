// app/api/cron/send-alerts/route.ts
//
// QA-001 fix: scheduled sender for the Pro "Email delivery of countdown alerts"
// feature. The DB trigger only creates renewalradarce_alerts rows; this route
// actually delivers them. It selects alerts with status='pending' AND
// trigger_on <= CURRENT_DATE, filters to users who have email alerts enabled
// and an entitled (paid) subscription, sends one digest email per user, then
// transitions the delivered alerts from 'pending' to 'sent'.
//
// Invoke on a schedule (e.g. Vercel Cron: { "path": "/api/cron/send-alerts", "schedule": "0 13 * * *" }).
// Guarded by CRON_SECRET:
//   GET/POST /api/cron/send-alerts
//   Authorization: Bearer <CRON_SECRET>   (or header: x-cron-secret: <CRON_SECRET>)
//
// Required env: CRON_SECRET, RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Optional: ALERTS_FROM_EMAIL, NEXT_PUBLIC_APP_URL.

import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const MAX_ALERTS_PER_RUN = 200;
const MAX_USERS_PER_RUN = 50;

function env(name: string): string {
  return process.env[name] || "";
}

function supabaseUrl(): string {
  return (env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")).replace(/\/+$/, "");
}

function serviceKey(): string {
  return env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_ROLE");
}

function str(row: Row | undefined, key: string): string {
  if (!row) return "";
  const v = row[key];
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

async function sbFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = serviceKey();
  return fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) || {}),
    },
    cache: "no-store",
  });
}

async function sbSelect(path: string): Promise<Row[]> {
  const res = await sbFetch(path);
  if (!res.ok) throw new Error(`Supabase query failed (${res.status}): ${path.split("?")[0]}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Row[]) : [];
}

async function markAlertsSent(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  // status=eq.pending keeps this idempotent if two runs overlap.
  const res = await sbFetch(`renewalradarce_alerts?id=in.(${ids.join(",")})&status=eq.pending`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "sent" }),
  });
  return res.ok;
}

async function markAlertsDismissed(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  // QA-023: alerts skipped for durable reasons (email alerts disabled / not
  // entitled) must leave 'pending', otherwise they are re-selected on every
  // run and — because the due query is capped at MAX_ALERTS_PER_RUN ordered by
  // trigger_on asc — stale non-entitled alerts starve entitled users' fresh
  // alerts. status=eq.pending keeps this idempotent if two runs overlap.
  const res = await sbFetch(`renewalradarce_alerts?id=in.(${ids.join(",")})&status=eq.pending`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "dismissed" }),
  });
  return res.ok;
}

async function lookupAuthEmail(userId: string): Promise<string> {
  const key = serviceKey();
  try {
    const res = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = (await res.json()) as Row;
    return typeof data.email === "string" ? data.email : "";
  } catch {
    return "";
  }
}

function emailAlertsEnabled(profile: Row): boolean {
  // Only an explicit opt-out disables delivery.
  return profile["email_alerts_enabled"] !== false;
}

function isEntitled(sub: Row | undefined): boolean {
  // Entitlement lives in renewalradarce_subscriptions (not on the profile, which
  // only stores id/email/full_name/role/timezone/email_alerts_enabled).
  // QA-025: subscriptions are batch-fetched (user_id=in.(...)) before the
  // per-user loop; this is now a pure check over the prefetched latest row.
  if (!sub) return false;

  const status = (
    str(sub, "status") ||
    str(sub, "subscription_status") ||
    str(sub, "plan_status")
  ).toLowerCase();
  if (
    ["canceled", "cancelled", "expired", "inactive", "unpaid", "incomplete_expired", "paused"].includes(
      status,
    )
  ) {
    return false;
  }

  const plan = (
    str(sub, "plan_id") ||
    str(sub, "plan") ||
    str(sub, "tier") ||
    str(sub, "price_id")
  ).toLowerCase();
  if (plan && (plan === "free" || plan === "none")) return false;

  if (["active", "trialing", "past_due", "complete"].includes(status)) return true;
  // A subscription row that names a paid plan without a disqualifying status counts.
  return Boolean(plan);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function alertLine(alert: Row, lic: Row | undefined): string {
  const custom = str(alert, "message") || str(alert, "body") || str(alert, "title");
  if (custom) return custom;
  const state = str(lic, "state_code") || str(lic, "state") || "your state";
  const kind = str(lic, "license_type") || str(lic, "kind") || str(lic, "type") || "license";
  const number = str(lic, "license_number") || str(lic, "number");
  const deadline =
    str(lic, "renewal_deadline") ||
    str(lic, "expires_on") ||
    str(lic, "renewal_date") ||
    str(lic, "expiration_date") ||
    str(alert, "trigger_on");
  const label = `${state} ${kind}${number ? ` #${number}` : ""}`;
  return deadline
    ? `${label} — renewal deadline ${deadline} is approaching. Verify your CE hours now.`
    : `${label} — a CE renewal deadline is approaching. Verify your CE hours now.`;
}

async function sendDigestEmail(to: string, lines: string[]): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return { ok: false, reason: "no_email_provider" };
  const from = env("ALERTS_FROM_EMAIL") || env("RESEND_FROM_EMAIL") || "RenewalRadar CE <onboarding@resend.dev>";
  const appUrl = (env("NEXT_PUBLIC_APP_URL") || env("NEXT_PUBLIC_SITE_URL")).replace(/\/+$/, "");
  const plural = lines.length === 1 ? "" : "s";
  const subject = `RenewalRadar CE: ${lines.length} CE deadline countdown alert${plural}`;
  const text = [
    `You have ${lines.length} CE countdown alert${plural}:`,
    "",
    ...lines.map((l) => `• ${l}`),
    "",
    appUrl ? `Review your licenses: ${appUrl}/licenses` : "",
    "",
    "— RenewalRadar CE (you can disable email alerts in Settings)",
  ].join("\n");
  const html = `<div style=\"font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111\">\n<h2 style=\"margin:0 0 12px;font-size:18px\">CE deadline countdown alert${plural}</h2>\n<p style=\"margin:0 0 12px\">You have ${lines.length} alert${plural} due:</p>\n<ul style=\"padding-left:20px;margin:0 0 16px\">${lines.map((l) => `<li style=\"margin:6px 0\">${escapeHtml(l)}</li>`).join("")}</ul>\n${appUrl ? `<p style=\"margin:0 0 16px\"><a href=\"${appUrl}/licenses\" style=\"background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block\">Review my licenses</a></p>` : ""}\n<p style=\"color:#666;font-size:12px;margin:0\">You are receiving this because email countdown alerts are enabled on your RenewalRadar CE account. You can turn them off in Settings.</p>\n</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!res.ok) return { ok: false, reason: `provider_error_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "provider_unreachable" };
  }
}

function safeSecretMatch(provided: string, expected: string): boolean {
  // Constant-time comparison to avoid leaking the secret via response timing.
  // Hash both sides so timingSafeEqual always gets equal-length buffers even
  // when the attacker-controlled input differs in length from the secret.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

async function handleCron(req: Request): Promise<NextResponse> {
  const secret = env("CRON_SECRET");
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  if (!safeSecretMatch(bearer, `Bearer ${secret}`) && !safeSecretMatch(headerSecret, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseUrl() || !serviceKey()) {
    return NextResponse.json({ ok: false, error: "Supabase server credentials are not configured" }, { status: 503 });
  }
  if (!env("RESEND_API_KEY")) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured; pending alerts were left untouched" },
      { status: 503 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  let due: Row[] = [];
  try {
    due = await sbSelect(
      `renewalradarce_alerts?status=eq.pending&channel=eq.email&trigger_on=lte.${today}&order=trigger_on.asc&limit=${MAX_ALERTS_PER_RUN}&select=*`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pending alerts";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const byUser = new Map<string, Row[]>();
  for (const alert of due) {
    const userId = str(alert, "user_id");
    if (!userId) continue;
    const list = byUser.get(userId);
    if (list) list.push(alert);
    else byUser.set(userId, [alert]);
  }

  // QA-025: batch-fetch profiles and subscriptions for every user in this run
  // with two queries (id=in.(...) / user_id=in.(...)) instead of two per-user
  // lookups inside the loop — an N+1 pattern that degrades as the base grows.
  const runUserIds = Array.from(byUser.keys()).slice(0, MAX_USERS_PER_RUN);
  const profileById = new Map<string, Row>();
  const latestSubByUserId = new Map<string, Row>();
  let profilesFetchOk = true;
  if (runUserIds.length > 0) {
    try {
      for (const p of await sbSelect(`renewalradarce_profiles?id=in.(${runUserIds.join(",")})&select=*`)) {
        const id = str(p, "id");
        if (id) profileById.set(id, p);
      }
    } catch {
      profilesFetchOk = false;
    }
    try {
      // order=created_at.desc + first-write-wins keeps the latest subscription
      // per user, matching the old per-user order=created_at.desc&limit=1.
      for (const s of await sbSelect(
        `renewalradarce_subscriptions?user_id=in.(${runUserIds.join(",")})&select=*&order=created_at.desc`,
      )) {
        const uid = str(s, "user_id");
        if (uid && !latestSubByUserId.has(uid)) latestSubByUserId.set(uid, s);
      }
    } catch {
      // Match the previous per-user behavior: a failed subscriptions lookup
      // resolves to "not entitled" (alerts get dismissed) for affected users.
    }
  }

  let emailsSent = 0;
  let alertsMarkedSent = 0;
  let alertsDismissed = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  const details: Array<{ user: string; alerts: number; outcome: string }> = [];

  for (const [userId, userAlerts] of Array.from(byUser.entries())) {
    if (processed >= MAX_USERS_PER_RUN) break;
    processed += 1;
    const record = (outcome: string) => details.push({ user: userId, alerts: userAlerts.length, outcome });

    if (!profilesFetchOk) {
      failed += 1;
      record("profile_lookup_failed");
      continue;
    }
    const profile = profileById.get(userId);
    if (!profile) {
      skipped += 1;
      record("skipped_no_profile");
      continue;
    }
    if (!emailAlertsEnabled(profile)) {
      skipped += 1;
      const dismissIds = userAlerts.map((a) => str(a, "id")).filter(Boolean);
      if (await markAlertsDismissed(dismissIds)) alertsDismissed += dismissIds.length;
      record("skipped_email_alerts_disabled");
      continue;
    }
    if (!isEntitled(latestSubByUserId.get(userId))) {
      skipped += 1;
      const dismissIds = userAlerts.map((a) => str(a, "id")).filter(Boolean);
      if (await markAlertsDismissed(dismissIds)) alertsDismissed += dismissIds.length;
      record("skipped_not_entitled");
      continue;
    }

    const email = str(profile, "email") || (await lookupAuthEmail(userId));
    if (!email) {
      skipped += 1;
      record("skipped_no_email_address");
      continue;
    }

    const licenseIds = Array.from(new Set(userAlerts.map((a) => str(a, "license_id")).filter(Boolean)));
    const licenseById = new Map<string, Row>();
    if (licenseIds.length > 0) {
      try {
        for (const lic of await sbSelect(`renewalradarce_licenses?id=in.(${licenseIds.join(",")})&select=*`)) {
          licenseById.set(str(lic, "id"), lic);
        }
      } catch {
        // License detail is best-effort; the digest still sends with generic lines.
      }
    }

    const lines = userAlerts.map((a) => alertLine(a, licenseById.get(str(a, "license_id"))));
    const delivery = await sendDigestEmail(email, lines);
    if (!delivery.ok) {
      failed += 1;
      record(delivery.reason || "send_failed");
      continue;
    }

    emailsSent += 1;
    const ids = userAlerts.map((a) => str(a, "id")).filter(Boolean);
    const marked = await markAlertsSent(ids);
    if (marked) {
      alertsMarkedSent += ids.length;
      record("sent");
    } else {
      failed += 1;
      record("sent_but_status_update_failed");
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    due: due.length,
    users: byUser.size,
    emails_sent: emailsSent,
    alerts_marked_sent: alertsMarkedSent,
    alerts_dismissed: alertsDismissed,
    skipped,
    failed,
    details,
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  return handleCron(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return handleCron(req);
}
