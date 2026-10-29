# Timeclock

Employee time clock. Next.js on Vercel, Supabase for the database and sign-in.
No server to run.

## How it works

- **Sign-in is phone number + 6-digit PIN.** No email and no text messages. Supabase
  Auth needs an email per account, so each number logs in under a stand-in address
  (`<number>@phone.timeclock.app`) that never gets mail. Forgot your PIN? A manager
  resets it on the Crew page.
- **Employees** are added by a manager (name, phone, starting PIN), then
  tap Clock In / Clock Out on their phone. They see this week's and last week's hours.
- **Managers** see who's on the clock, approve and deactivate people, fix or add
  missed punches (a reason is required and every change goes in the change log),
  view weekly totals with overtime, and download a payroll CSV.
- **The manager signs up once** under "Manager setup" on the login page with the
  number in `settings.manager_phone` (set in the database). Nobody else can sign up;
  the manager adds everyone from the Crew page.
- Punch times come from the database clock, not the phone. Employees can't write to
  the tables directly; everything goes through the functions in
  `supabase/migrations/0001_init.sql`, and row-level security keeps each employee to
  their own rows.

## Setup

1. Supabase project: `Timeclock` (`ejoihhozsrrtmunxhvfy`) in AGA Technologies LLC.
   The migrations in `supabase/migrations` are already applied.
2. Supabase dashboard → Authentication → Providers → Email: turn **off** "Confirm
   email". Required: the stand-in addresses can't receive a confirmation.
3. Vercel project env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://ejoihhozsrrtmunxhvfy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API>`
4. The manager signs up with the manager phone number, then sets the time zone,
   pay-week start and overtime threshold under **Crew → Settings**.

## Local dev

    cp .env.local.example .env.local   # fill in the key
    npm install
    npm run dev
    npm test
