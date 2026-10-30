import { Fragment } from "react";
import { OFFICE_HOURS, SITE, type Button, type Section } from "@/lib/site/content";
import { siteHref } from "@/lib/site/base";

const COLORS = ["var(--peach)", "var(--lavender)", "var(--mint)", "var(--sky)"];

export const photo = (id: string) => `/site/${id}.webp`;

function Photo({ id, alt, className }: { id: string; alt: string; className?: string }) {
  // The photos are already resized webp files, so a plain img is all they need.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo(id)} alt={alt} loading="lazy" className={className} />;
}

// Turns email addresses in plain text into mail links.
function Linked({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+\.[\w.]+[\w])/);
  return <>{parts.map((p, i) => (i % 2 ? <a key={i} href={`mailto:${p}`}>{p}</a> : <Fragment key={i}>{p}</Fragment>))}</>;
}

// Paragraphs are separated by a blank line; single line breaks are kept.
function Body({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 text-lg leading-relaxed ${className}`}>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j) => (
            <Fragment key={j}>{j > 0 && <br />}<Linked text={line} /></Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

function Buttons({ buttons, base }: { buttons?: Button[]; base: string }) {
  if (!buttons?.length) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {buttons.map((b, i) => {
        const href = siteHref(base, b.href);
        const outside = href.startsWith("http");
        return (
          <a key={b.href + b.label} href={href} className="btn" style={{ background: COLORS[i % COLORS.length], color: "var(--charcoal)" }}
            {...(outside ? { target: "_blank", rel: "noopener" } : {})}>
            {b.label}
          </a>
        );
      })}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{children}</h2>;
}

export function SectionView({ section: s, base, index }: { section: Section; base: string; index: number }) {
  switch (s.kind) {
    case "hero":
      return (
        <section className="relative overflow-hidden rounded-[2rem] border-[3px]" style={{ borderColor: "var(--charcoal)", boxShadow: "8px 8px 0 var(--lavender)" }}>
          <Photo id={s.image} alt="" className="h-[22rem] w-full object-cover sm:h-[30rem]" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white sm:p-10"
            style={{ background: "linear-gradient(to top, rgba(30,28,34,.78), rgba(30,28,34,.15) 60%, transparent)" }}>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{s.title}</h1>
            {s.text && <p className="mt-3 max-w-2xl text-lg sm:text-xl">{s.text}</p>}
            <Buttons buttons={s.buttons} base={base} />
          </div>
        </section>
      );

    case "text": {
      const flip = index % 2 === 1;
      return (
        <section className={`card grid items-center gap-6 sm:p-8 ${s.image ? "md:grid-cols-2" : ""}`}>
          {s.image && (
            <Photo id={s.image} alt="" className={`w-full rounded-2xl border-2 object-cover ${flip ? "md:order-2" : ""}`} />
          )}
          <div>
            {s.title && (index === 0 ? <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{s.title}</h1> : <Heading>{s.title}</Heading>)}
            <Body text={s.body} />
            <Buttons buttons={s.buttons} base={base} />
          </div>
        </section>
      );
    }

    case "list":
      return (
        <section className="card sm:p-8">
          <Heading>{s.title}</Heading>
          {s.note && <p className="muted -mt-2 mb-4 text-lg font-medium">{s.note}</p>}
          <ul className="space-y-2 text-lg">
            {s.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="mt-2 h-3 w-3 shrink-0 rounded-full border-2" style={{ background: COLORS[i % COLORS.length], borderColor: "var(--charcoal)" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      );

    case "cards":
      return (
        <section>
          {(s.title || s.image) && (
            <div className="mb-6 grid items-center gap-6 md:grid-cols-2">
              <div>
                {s.title && <Heading>{s.title}</Heading>}
                {s.intro && <p className="muted -mt-2 text-xl">{s.intro}</p>}
              </div>
              {s.image && <Photo id={s.image} alt="" className="max-h-72 w-full rounded-3xl border-[3px] object-cover" />}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            {s.items.map((item, i) => (
              <div key={item.title} className="card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold"
                  style={{ background: COLORS[i % COLORS.length], borderColor: "var(--charcoal)", color: "var(--charcoal)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                <Body text={item.body} className="mt-2 !text-base" />
                {item.button && <Buttons buttons={[item.button]} base={base} />}
              </div>
            ))}
          </div>
        </section>
      );

    case "tiles":
      return (
        <section>
          {s.title && <Heading>{s.title}</Heading>}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {s.items.map((item, i) => {
              const inner = (
                <>
                  <Photo id={item.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="block p-4 text-lg font-bold leading-snug sm:text-xl">{item.caption}</span>
                </>
              );
              const cls = "block overflow-hidden rounded-3xl border-[3px] no-underline";
              const style = { background: COLORS[i % COLORS.length], borderColor: "var(--charcoal)", color: "var(--charcoal)", boxShadow: "0 5px 0 var(--charcoal)" };
              return item.href
                ? <a key={i} href={siteHref(base, item.href)} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener" className={cls} style={style}>{inner}</a>
                : <div key={i} className={cls} style={style}>{inner}</div>;
            })}
          </div>
        </section>
      );

    case "people":
      return (
        <section>
          {s.title && (index === 0 ? <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{s.title}</h1> : <Heading>{s.title}</Heading>)}
          <div className={`grid gap-6 ${s.items.some((p) => p.bio) ? "" : "grid-cols-2 md:grid-cols-4"}`}>
            {s.items.map((p) => p.bio ? (
              <article key={p.name} className="card grid gap-5 sm:grid-cols-[12rem_1fr]">
                <Photo id={p.image} alt={p.name} className="aspect-square w-full max-w-[12rem] rounded-2xl border-2 object-cover" />
                <div>
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  {p.role && <p className="muted font-medium">{p.role}</p>}
                  <Body text={p.bio} className="mt-2 !text-base" />
                </div>
              </article>
            ) : (
              <figure key={p.name} className="card text-center">
                <Photo id={p.image} alt={p.name} className="aspect-[3/4] w-full rounded-2xl border-2 object-cover" />
                <figcaption className="mt-3">
                  <span className="block text-lg font-bold">{p.name}</span>
                  {p.role && <span className="muted block text-sm font-medium">{p.role}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      );

    case "gallery":
      return (
        <section>
          {s.title && (index === 0 ? <h1 className="mb-6 text-3xl font-bold sm:text-4xl">{s.title}</h1> : <Heading>{s.title}</Heading>)}
          <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {s.images.map((id) => (
              <a key={id} href={photo(id)} target="_blank" rel="noopener" className="block break-inside-avoid">
                <Photo id={id} alt="" className="w-full rounded-2xl border-[3px]" />
              </a>
            ))}
          </div>
        </section>
      );

    case "buttons":
      return <div className="flex justify-center"><Buttons buttons={s.buttons} base={base} /></div>;

    case "contact":
      return (
        <section className="card grid gap-6 sm:p-8 md:grid-cols-2">
          <div>
            {s.title && <Heading>{s.title}</Heading>}
            {s.text && <p className="mb-3 text-lg">{s.text}</p>}
            <p className="text-lg leading-relaxed">
              <a href={`tel:+1${SITE.phone.replace(/\D/g, "")}`} className="font-semibold">{SITE.phone}</a><br />
              <a href={`mailto:${SITE.email}`} className="font-semibold">{SITE.email}</a><br />
              <a href={`https://maps.google.com/?q=${encodeURIComponent(SITE.address.join(", "))}`} target="_blank" rel="noopener">
                {SITE.address[0]}<br />{SITE.address[1]}
              </a>
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-xl font-bold">Office Hours</h3>
            <p className="text-lg">{OFFICE_HOURS}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`tel:+1${SITE.phone.replace(/\D/g, "")}`} className="btn" style={{ background: "var(--mint)", color: "var(--charcoal)" }}>Call</a>
              <a href={`sms:+1${SITE.phone.replace(/\D/g, "")}`} className="btn" style={{ background: "var(--sky)", color: "var(--charcoal)" }}>Text</a>
              <a href={`mailto:${SITE.email}`} className="btn" style={{ background: "var(--peach)", color: "var(--charcoal)" }}>Email</a>
            </div>
          </div>
        </section>
      );
  }
}
