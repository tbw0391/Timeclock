# To do

## Now
- [ ] Try the 🌐 Website tile on a phone: the banner, a page's words (e.g. Preschool prices
      and calendar), a photo from the camera roll, an event, and the contact details.
      Send yourself a message from /site/contactus and check ✉️ Website messages.
- [ ] **Vercel login wall** (Todd): Vercel → `timeclock` → Settings → Deployment Protection. If
      "Vercel Authentication" covers all deployments, switch to Standard Protection so staff
      (and later the public) aren't asked to log in to Vercel. Then check
      https://timeclock-tbw0391.vercel.app/site on a phone.
- [ ] **Website editor** (step 2): a 🌐 Website tile for managers to
  - [x] change the top banner ("No school on …")
  - [x] edit page text, prices, the calendar, button links and contact details
  - [x] add, reorder and remove photos from a phone (with a photo-permission reminder)
  - [x] contact form that saves messages in the app (replaces the Wix forms)
  - [x] upcoming events
  - [ ] maybe: text or email a manager when a website message comes in

## Waiting on Todd
- [ ] Anthropic API key for website translation: README → Public website → Website translation.
      Then press "Translate the whole site" and have a native speaker read each language
- [ ] Gusto approval for the live connection (Developer Portal app, `time_sheet:write`); then the
      turn-on steps in README → Gusto, trying Gusto's demo site first
- [ ] New-family forms for the iPad paperwork (put them in `../forms/`, outside git)
- [ ] Gusto: try "Download for Gusto" (Timesheets) on one pay period in Gusto → Run payroll → Import hours;
      say if a column or a name doesn't match (columns copied from the estimator app, not yet checked against Gusto)

## Moving the website off Wix
- [ ] Rebuild done at `/site`; compare it side by side with thekitelc.com
- [ ] Lori tries the editor and is comfortable with it
- [ ] Add `staff.thekitelc.com` (staff app) and `thekitelc.com` (website) in Vercel; set
      `SITE_HOSTS` and `STAFF_URL`; update DNS in Wix (or move the domain)
- [ ] Cancel the Wix plan

## Later hub features
- [x] Announcements + certifications (Nov 7); enter everyone's certifications under 🎓
- [x] Time-off requests (Nov 7)
- [ ] Staff schedule

## Housekeeping
- [ ] Put a name on the 6145988992 admin account
- [ ] Replace the 12 test children with the real roster
- [ ] Native-speaker check of the Farsi, Dari, Pashto and Arabic translations
- [ ] Upgrade the Twilio trial before real staff use it
- [ ] Vercel Pro (the free plan is for personal, non-commercial use)
