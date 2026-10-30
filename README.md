# Timeclock

Employee time clock. Next.js on Vercel, Supabase for the database and sign-in.
No server to run.

## How it works

- **Sign-in is a code texted to your phone.** Enter your number, get a text, type the
  code. No passwords, PINs or email. This uses Supabase phone auth, so an SMS
  provider has to be connected in Supabase (see Setup).
- **Only numbers a manager added can sign in.** Asking for a code from any other
  number is refused before an account is made or a text is sent.
- **The manager** (the number in `settings.manager_phone`, set in the database) just
  signs in. The first code creates the manager account.
- **Employees** are added by a manager on the Crew page (name + phone), then tap
  Clock In / Clock Out on their phone. They see this week's and last week's hours.
- **Managers** see who's on the clock, deactivate people, fix or add missed punches
  (a reason is required and every change goes in the change log), view weekly
  totals with overtime, and download a payroll CSV.
- **Staff hub.** The home page is a grid of tools; the time clock (`/time`) is
  one of them. New tools get a tile on `app/page.tsx`.
- **Languages:** English, Farsi, Dari, Pashto and Arabic, picked per device with
  the language buttons (login page, header, kiosk). Right-to-left languages flip
  the layout. Text lives in `lib/i18n/messages/`; to add a language, add it to
  `lib/i18n/locales.ts`, copy `en.ts`, translate, and register it in
  `messages/index.ts` (`npm test` fails if any text is missing). The non-English
  text was machine-drafted and should be reviewed by native speakers. Payroll
  exports stay in English.
- **Kiosk mode:** a shared tablet where staff tap their name and enter a 4-digit
  kiosk PIN (defaults to the last 4 digits of their phone). Set up from Crew.
- **Suggestion box:** anyone can send managers an idea, optionally anonymously.
- **Clock-ins and clock-outs are GPS tagged.** The phone asks for location when the
  button is tapped. If it can't get one (blocked, GPS off, timed out) the punch still
  counts but is flagged on the timesheet and in the export. Times a manager enters
  show as "manual".
- **Exports:** Timesheets → **Download Excel** (Punches and Weekly totals tabs, map
  links, hours as numbers) or **Download CSV**.
- Punch times come from the database clock, not the phone. Employees can't write to
  the tables directly; everything goes through the functions in
  `supabase/migrations`, and row-level security keeps each employee to their own rows.

## Setup

1. Supabase project: `Timeclock` (`ejoihhozsrrtmunxhvfy`) in AGA Technologies LLC.
   Migrations 0001–0009 in `supabase/migrations` are already applied. Don't run them
   again.
2. Supabase dashboard → Authentication → Sign In / Providers → **Phone**: turn it on
   and connect an SMS provider. Twilio Verify is the simplest in the US because it
   doesn't need your own registered sending number (A2P 10DLC). Raise the SMS code
   expiry to about 5 minutes; texts can be slow. "Allow new users to sign up" must
   stay on so the manager's first sign-in can create their account; the database
   blocks everyone else.
3. Vercel project env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL=https://ejoihhozsrrtmunxhvfy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API>`
4. The manager signs in with their number, then sets the time zone, pay-week start
   and overtime threshold under **Crew → Settings** and adds the crew.

## Local dev

    cp .env.local.example .env.local   # fill in the key
    npm install
    npm run dev
    npm test
