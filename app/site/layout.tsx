import { MENU, SITE } from "@/lib/site/content";
import { siteHref } from "@/lib/site/base";
import { LOCALES } from "@/lib/i18n/locales";
import { siteBase, siteContact, siteLang, siteNotice, sitePath, siteRoot, siteTr } from "@/lib/site/server";
import { SITE_UI } from "@/lib/site/strings";
import { translateOn } from "@/lib/site/translate";
import { photo } from "@/components/site/Sections";

// The public website's frame: notice banner, logo and menu, and footer.
// STAFF_URL (e.g. https://staff.thekitelc.com) is where the staff app lives once
// the site has its own domain. Its language comes from the address ("/fa/…"),
// not from the staff app's language; translations are made when managers save.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [base, root, lang, path, notice, contact, tr] = await Promise.all([
    siteBase(), siteRoot(), siteLang(), sitePath(), siteNotice(), siteContact(), siteTr(),
  ]);
  const link = (slug: string) => siteHref(base, "/" + slug);
  // The same page in another language.
  const inLang = (l: string) => (root + (l === "en" ? "" : `/${l}`) + (path === "/" ? "" : path)) || "/";
  return (
    <div dir={lang ? "rtl" : "ltr"} lang={lang ?? "en"} className="flex min-h-screen flex-col">
      {notice && (
        <p className="border-b-[3px] px-4 py-2 text-center font-semibold" style={{ background: "var(--bow)", color: "var(--charcoal)", borderColor: "var(--charcoal)" }}>
          {tr(notice)}
        </p>
      )}
      {translateOn() && (
        <nav aria-label={tr(SITE_UI.language)} className="flex flex-wrap justify-center gap-x-4 gap-y-1 bg-white px-4 py-1.5 text-sm">
          {Object.entries(LOCALES).map(([l, { name }]) => (
            <a key={l} href={inLang(l)} lang={l} hrefLang={l} aria-current={(lang ?? "en") === l ? "true" : undefined}
              className={(lang ?? "en") === l ? "font-bold no-underline" : "no-underline"} style={{ color: (lang ?? "en") === l ? "var(--charcoal)" : "#7a4fb0" }}>
              {name}
            </a>
          ))}
        </nav>
      )}
      <header className="relative border-b-[3px] bg-white" style={{ borderColor: "var(--charcoal)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href={link("")} aria-label="The KITE Learning Center home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo("logo")} alt="The KITE Learning Center" className="h-14 w-auto sm:h-16" />
          </a>
          {/* Wide screens: a dropdown per group. */}
          <nav className="hidden items-center gap-1 lg:flex">
            {MENU.map((group) => (
              <div key={group.label} className="group relative">
                <button className="rounded-full px-4 py-2 font-semibold group-hover:bg-[var(--bow)] group-focus-within:bg-[var(--bow)]" style={{ color: "var(--charcoal)" }}>
                  {tr(group.label)} ▾
                </button>
                <div className="invisible absolute end-0 z-20 min-w-64 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="rounded-2xl border-[3px] bg-white p-2" style={{ borderColor: "var(--charcoal)", boxShadow: "5px 5px 0 var(--lavender)" }}>
                    {group.links.map((l) => (
                      <li key={l.slug}>
                        <a href={link(l.slug)} className="block rounded-xl px-3 py-2 font-medium no-underline hover:bg-[var(--mint)]" style={{ color: "var(--charcoal)" }}>{tr(l.label)}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            <a href={link("contactus")} className="btn ms-2" style={{ background: "var(--peach)", color: "var(--charcoal)" }}>{tr(SITE_UI.contact)}</a>
          </nav>
          {/* Phones and tablets: one tap opens the whole menu. */}
          <details className="lg:hidden">
            <summary className="btn cursor-pointer list-none" style={{ background: "var(--mint)" }}>{tr(SITE_UI.menu)}</summary>
            <div className="absolute inset-x-0 z-20 mt-3 border-y-[3px] bg-white px-4 py-4" style={{ borderColor: "var(--charcoal)" }}>
              <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2">
                {MENU.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: "#6e6875" }}>{tr(group.label)}</p>
                    {group.links.map((l) => (
                      <a key={l.slug} href={link(l.slug)} className="block py-1.5 text-lg font-semibold no-underline" style={{ color: "var(--charcoal)" }}>{tr(l.label)}</a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8 sm:py-10">{children}</main>

      <footer className="border-t-[3px] bg-white" style={{ borderColor: "var(--charcoal)", color: "var(--charcoal)" }}>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
          <div>
            <p className="font-bold">{SITE.name}</p>
            <p>{contact.address[0]}<br />{contact.address[1]}</p>
          </div>
          <div>
            <a href={`tel:+1${contact.phone.replace(/\D/g, "")}`} className="block font-semibold" style={{ color: "#7a4fb0" }}>{contact.phone}</a>
            <a href={`mailto:${contact.email}`} className="block font-semibold" style={{ color: "#7a4fb0" }}>{contact.email}</a>
            <div className="mt-2 flex gap-4">
              <a href={SITE.instagram} target="_blank" rel="noopener" style={{ color: "#7a4fb0" }}>Instagram</a>
              <a href={SITE.facebook} target="_blank" rel="noopener" style={{ color: "#7a4fb0" }}>Facebook</a>
            </div>
          </div>
          <div className="text-sm">
            <p>{tr(SITE.footnote)}</p>
            <p className="mt-2">© {new Date().getFullYear()} {SITE.name}</p>
            <a href={`${process.env.STAFF_URL ?? ""}/login`} className="mt-2 inline-block font-semibold" style={{ color: "#7a4fb0" }}>{tr(SITE_UI.staff)}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
