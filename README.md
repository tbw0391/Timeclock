# Timeclock

Employee time clock. Next.js on Vercel, Supabase for the database and sign-in.
No server to run.

## How it works

- **Employees** sign up with their email, wait for a manager to approve them, then
  tap Clock In / Clock Out on their phone. They see this week's and last week's hours.
- **Managers** see who's on the clock, approve and deactivate people, fix or add
  missed punches (a reason is required and every change goes in the change log),
  view weekly totals with overtime, and download a payroll CSV.
- **The first person to sign up becomes the manager.**
- Punch times come from the database clock, not the phone. Employees can't write to
  the tables directly; everything goes through the functions in
  `supabase/migrations/0001_init.sql`, and row-level security keeps each employee to
  their own rows.

## Setup

1. Supabase project: `Timeclock` (`ejoihhozsrrtmunxhvfy`) in AGA Technologies LLC.
   The migrations in `supabase/migrations` are already applied.
2. Supabase dashboard → Authentication → URL Configuration: set **Site URL** to the
   Vercel URL and add `https://<your-domain>/auth/callback` to **Redirect URLs**.
3. Vercel project env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://ejoihhozsrrtmunxhvfy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API>`
4. Sign up first to become the manager, then set the time zone, pay-week start and
   overtime threshold under **Crew → Settings**.

Supabase's built-in email sender is rate-limited to a few emails an hour. Either
turn off **Confirm email** (Authentication → Providers → Email), since managers
approve every account anyway, or add your own SMTP under Authentication → Emails.

## Local dev

    cp .env.local.example .env.local   # fill in the key
    npm install
    npm run dev
    npm test
