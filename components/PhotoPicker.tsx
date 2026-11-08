"use client";

import { useState } from "react";
import { PHOTO_MAX_SIDE, photoUrl } from "@/lib/site/photos";

type Upload = (form: FormData) => Promise<{ id?: string; error?: string }>;

export type PhotoLabels = {
  change: string; add: string; addMany: string; remove: string; left: string; right: string;
  uploading: string; badType: string; none: string;
};

// Shrinks a photo from the phone to a JPEG no bigger than PHOTO_MAX_SIDE on
// its long side. Phones hand over iPhone (HEIC) photos as JPEG when picked
// from a web page, and browsers turn photos upright as they decode them.
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85));
}

async function send(file: File, upload: Upload, badType: string) {
  let blob: Blob;
  try {
    blob = await shrink(file);
  } catch {
    return { error: badType };
  }
  const form = new FormData();
  form.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  return upload(form);
}

function Thumb({ id, none }: { id: string; none: string }) {
  if (!id) return <div className="muted flex h-24 w-32 items-center justify-center rounded-xl border-2 border-dashed text-xs" style={{ borderColor: "var(--soft-line)" }}>{none}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl(id)} alt="" className="h-24 w-32 rounded-xl object-cover" />;
}

// One photo: shows it, with a button to replace it (and to remove it, when
// the spot can be empty). The chosen photo's name goes in a hidden field.
export function PhotoPicker({ name, value, optional, upload, labels }: {
  name: string; value?: string; optional?: boolean; upload: Upload; labels: PhotoLabels;
}) {
  const [id, setId] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const r = await send(file, upload, labels.badType);
    setBusy(false);
    if (r.id) setId(r.id);
    else setError(r.error ?? labels.badType);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="hidden" name={name} value={id} />
      <Thumb id={id} none={labels.none} />
      <div className="space-y-2">
        <label className="btn-ghost inline-block cursor-pointer">
          {busy ? labels.uploading : id ? labels.change : labels.add}
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {optional && id && !busy && (
          <button type="button" className="btn-ghost ms-2" onClick={() => setId("")}>{labels.remove}</button>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

// A whole gallery: add several photos at once, move them, remove them. The
// order goes in a hidden field as a comma-separated list.
export function GalleryPicker({ name, value, upload, labels }: {
  name: string; value: string[]; upload: Upload; labels: PhotoLabels;
}) {
  const [ids, setIds] = useState(value);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setError("");
    setBusy(list.length);
    // One at a time keeps a phone on a slow connection from timing out.
    for (const file of list) {
      const r = await send(file, upload, labels.badType);
      setBusy((n) => n - 1);
      if (r.id) setIds((cur) => [...cur, r.id!]);
      else setError(r.error ?? labels.badType);
    }
  }

  const move = (i: number, by: number) => setIds((cur) => {
    const next = [...cur];
    const j = i + by;
    if (j < 0 || j >= next.length) return cur;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={ids.join(",")} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ids.map((id, i) => (
          <li key={id} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(id)} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            <div className="flex justify-between gap-1" dir="ltr">
              <button type="button" className="btn-ghost px-3" aria-label={labels.left} disabled={i === 0} onClick={() => move(i, -1)}>←</button>
              <button type="button" className="btn-ghost px-3" onClick={() => setIds((cur) => cur.filter((x) => x !== id))}>{labels.remove}</button>
              <button type="button" className="btn-ghost px-3" aria-label={labels.right} disabled={i === ids.length - 1} onClick={() => move(i, 1)}>→</button>
            </div>
          </li>
        ))}
      </ul>
      <label className="btn-ghost inline-block cursor-pointer">
        {busy ? `${labels.uploading} (${busy})` : labels.addMany}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={busy > 0} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
