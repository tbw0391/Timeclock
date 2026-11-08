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
  links, hours as numbers) or **Download CSV**. **Download for Gusto** gives the file
  Gusto takes under Run payroll → Import hours: `first_name, last_name, regular_hours,
  overtime_hours` per person for the dates picked, overtime worked out week by week.
  Names are split on the last word, so they need to match Gusto's.
- Punch times come from the database clock, not the phone. Employees can't write to
  the tables directly; everything goes through the functions in
  `supabase/migrations`, and row-level security keeps each employee to their own rows.

## Setup

1. Supabase project: `Timeclock` (`ejoihhozsrrtmunxhvfy`) in AGA Technologies LLC.
   Migrations 0001–0011 and 0014–0018 in `supabase/migrations` are already applied
   (0012 QuickBooks and 0013 Gusto are off; see below). Don't run them
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

## Public website

A copy of thekitelc.com (the Wix site) lives at `/site`, built from
`lib/site/content.ts` (pages made of a few kinds of sections) and the photos in
`public/site`. It needs no sign-in. It's in English, and in Farsi, Dari,
Pashto and Arabic once translation is on (below).

Managers edit it from the 🌐 Website tile (`/admin/website`): the banner across
the top of every page (with an optional last day after which it hides itself),
the words, prices, calendar dates and button links on each page, and the
phone, email, address and office hours. Edits are stored in the `site_content`
table and laid over `lib/site/content.ts` (`lib/site/edit.ts`); a page with no
edits, or whose sections in the code have changed kind or number, shows the
code's version. The layout isn't editable.

- **Photos:** managers change, add, remove and reorder photos from their phone.
  The phone shrinks each one to a JPEG (`components/PhotoPicker.tsx`) and it's
  stored in the public `site-photos` bucket; pages name it `up/<uuid>.jpg`
  (`lib/site/photos.ts`). Photos that are replaced stay in the bucket.
- **Contact form:** every contact box has a "Send us a message" form. Messages
  go to `site_messages` and show under ✉️ Website messages (a hub tile with the
  count of new ones). A hidden field, a 3-second minimum and a cap of 30 an hour
  keep bots out. Nobody is emailed or texted about a new message; check the tile.
- **Upcoming events:** added on the Website page (date, name, details) and
  shown on the Upcoming Events page; each drops off after its day.

To serve it at a domain's root, set `SITE_HOSTS` (e.g.
`thekitelc.com,www.thekitelc.com`) and `STAFF_URL` (e.g.
`https://staff.thekitelc.com`) in Vercel; the middleware then maps
`thekitelc.com/preschool` to `/site/preschool`, so the Wix URLs keep working.

### Website translation (off until an API key is added)

The site can be read in the staff app's other languages at `/fa/…`, `/prs/…`,
`/ps/…` and `/ar/…` (e.g. `/site/fa/preschool`), right to left, with a language
picker across the top. Translations are stored one string at a time in
`site_strings` (`lib/site/strings.ts` finds the strings; names, links and photos
aren't translated). When a manager saves English text, any string without a
translation is sent to Claude (`lib/site/translate.ts`) and stored, so visitors
never wait on it. Changed English is a new string and gets a new translation;
anything not translated yet shows in English. On a page's editor, the
language tabs show each string's translation to check and correct; a
manager's correction is never overwritten by a machine translation.

To turn it on:
1. Create an API key at console.anthropic.com (Settings → API keys) and add
   billing there.
2. In Vercel → `timeclock` → Settings → Environment Variables, add
   `ANTHROPIC_API_KEY` with the key, then redeploy.
3. On the Website page, press **Translate the whole site** (repeat if it says
   some are left). The whole site is about 180 strings, roughly 14,000
   characters, into four languages; after that, only new or changed text is
   translated when it's saved.
4. Ask a native speaker to read through each language on the page editors.

Without the key there's no picker, nothing is translated, and the editors
don't show language tabs.

## QuickBooks (off)

Copied from the estimator app in case payroll moves to QuickBooks Payroll. When it's on,
a manager connects QuickBooks from a card at the bottom of Crew, picks the first day to
send, and taps **Send to QuickBooks**. Each finished punch goes across as a timesheet
entry (TimeActivity) under a QuickBooks employee with the same name (created if missing),
dated the day the shift started. Edited punches are sent again; deleted ones are deleted
in QuickBooks too. Nothing else (pay rates, overtime, payroll runs) is sent.

None of it is live yet. To turn it on:

1. Apply `supabase/migrations/0012_quickbooks.sql`.
2. At developer.intuit.com, create an app (Accounting scope) or reuse the estimator's, and
   add the redirect URI `https://ejoihhozsrrtmunxhvfy.supabase.co/functions/v1/quickbooks`.
3. Supabase → Edge Functions → secrets: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, and
   `QBO_ENV` (`sandbox` for a test company, `production` for the real books).
4. Deploy `supabase/functions/quickbooks` with JWT verification off
   (`supabase functions deploy quickbooks --no-verify-jwt`); Intuit's return trip has no
   sign-in, and the function checks managers itself.
5. Vercel: set `QUICKBOOKS=on` so the card shows on Crew.

Try it against a sandbox company first. Payroll is in Gusto (Nov 2026), so it stays off.

## Gusto (off until Gusto approves the app)

Payroll is in Gusto. Until this is on, use Timesheets → **Download for Gusto**. When it's
on, a 🔗 Gusto tile opens `/admin/gusto`, where a manager connects Gusto, picks the first
day to send, and checks who is who (people whose name matches one Gusto employee exactly
are matched for them). **Send to Gusto** sends each finished shift to Gusto's Time
Tracking API as a time sheet, split into Regular and Overtime hours using Crew → Settings
(overtime counted by the pay week, in shift order). In Gusto the hours wait until the
admin picks Run payroll → Sync hours from connected time tracking apps. A changed shift,
or one whose overtime moved because of an edit earlier in the week, is deleted and sent
again; deleted shifts are deleted in Gusto. Shifts for people not matched are held back
and counted on the page. A shift changed after its pay period was paid needs an off-cycle
payroll in Gusto, and Gusto may refuse to change hours already synced to payroll (the
error shows on the page).

Built from Gusto's docs, not yet run against Gusto. To turn it on:

1. Apply `supabase/migrations/0013_gusto.sql`.
2. In Gusto's Developer Portal (dev.gusto.com), create a time tracking app with the
   redirect URI `https://ejoihhozsrrtmunxhvfy.supabase.co/functions/v1/gusto`, and get it
   approved for production. It needs to read employees and write time sheets
   (`time_sheet:write`).
3. Supabase → Edge Functions → secrets: `GUSTO_CLIENT_ID`, `GUSTO_CLIENT_SECRET`, and
   `GUSTO_ENV` (`demo` for Gusto's test site, `production` for the real account).
4. Deploy `supabase/functions/gusto` with JWT verification off
   (`supabase functions deploy gusto --no-verify-jwt`).
5. Vercel: set `GUSTO=on`.

Try it on Gusto's demo site first. The overtime split lives in
`supabase/functions/_shared/overtime.ts` (tested in `tests/overtime.test.ts`).

