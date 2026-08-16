# SUPABASE-SETUP — RenewalRadar CE

Manual Supabase Dashboard configuration for this product. These settings live in the Supabase project (not in code), so Deploy MUST apply them by hand and re-verify them after any project migration or restore.

## REQUIRED — Set Auth minimum password length to 8 (fixes QA-005)

Supabase projects default to a **6**-character minimum password. RenewalRadar CE promises and enforces **8** characters client-side in both:

- `app/(auth)/signup/page.tsx` — input `minLength={8}` plus a pre-submit check ("Passwords need at least 8 characters.")
- `app/(auth)/reset-password/page.tsx` — input `minLength={8}` plus a pre-submit check

Client-side checks can be bypassed by calling the Supabase Auth API directly. If the project is left at the default of 6, the server will accept weaker passwords than the UI promises.

### Deploy steps

1. Supabase Dashboard → **Authentication** → **Providers** → **Email** (on newer dashboards: **Authentication** → **Settings** → **Passwords**).
2. Set **Minimum password length** to **8**.
3. Save.

### Verify enforcement

Run this against the project — it should FAIL with a password-length error:

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"qa005-check@example.com","password":"abc123"}'
```

Expected: an error such as `Password should be at least 8 characters`. If a user object is returned instead, the server policy is still 6 — do not ship until this is corrected.

## Other Auth settings (for reference)

- **Email provider:** enabled. Signup sends a confirmation link with `emailRedirectTo` → `<site>/auth/callback?next=/dashboard`.
- **Google OAuth:** enabled; uses the same `/auth/callback` redirect.
- **URL Configuration:** Site URL = production domain; allowed redirect URLs must include `https://<production-domain>/auth/callback` and `http://localhost:3000/auth/callback` (local dev).
