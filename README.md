# Timeclock

Employee time clock. Next.js on Vercel, Supabase for the database and sign-in.
No server to run.

## How it works

- **Sign-in is phone number + PIN (6+ digits).** Nobody uses email. Supabase Auth
  still keys accounts by email, so each number signs in as
  `<10 digits>@phone.timeclock.app`, an address that never gets mail.
- **The manager** (the number in `settings.manager_phone`) sets up their own account
  once with **Manager setup** on the login page. Nobody else can sign up.
- **Everyone else** is added by a manager on the **Crew** page with a name, phone
  number and starting PIN. Managers also reset forgotten PINs there; people can
  change their own PIN under their name in the header.
- **Employees** tap Clock In / Clock Out on their phone and see this week's and last
  week's hours.
- **Managers** see who's on the clock, deactivate people, fix or add missed punches
  (a reason is required and every change goes in the change log), view weekly totals
  with overtime, and download a payroll CSV.
- Punch times come from the database clock, not the phone. Employees can't write to
  the tables directly; everything goes through the functions in
  `supabase/migrations`, and row-level security keeps each employee to their own rows.

## Setup

1. Supabase project: `Timeclock` (`ejoihhozsrrtmunxhvfy`) in AGA Technologies LLC.
   Migrations 0001–0004 in `supabase/migrations` are already applied. Don't run them
   again.
2. Supabase dashboard → Authentication → Sign In / Providers → Email: Email provider
   **on**, **Confirm email off** (the placeholder addresses can't receive mail).
3. Vercel project env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://ejoihhozsrrtmunxhvfy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API>`
4. The manager opens the site, taps **Manager setup**, and signs up with their phone
   number. Then set the time zone, pay-week start and overtime threshold under
   **Crew → Settings**, and add the crew.

## Local dev

    cp .env.local.example .env.local   # fill in the key
    npm install
    npm run dev
    npm test
