// Website photos are named two ways: the ones copied from Wix ("8563dd3d",
// a file in public/site) and ones managers upload ("up/<uuid>.jpg", in the
// site-photos storage bucket; see 0016_site_photos.sql).

const BUILT_IN = /^[0-9a-f]{8}$/;
const UPLOADED = /^up\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

export const isPhotoId = (id: string) => BUILT_IN.test(id) || UPLOADED.test(id);

export function photoUrl(id: string) {
  if (id.startsWith("up/")) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-photos/${id.slice(3)}`;
  return `/site/${id}.webp`;
}

// Photos are shrunk on the phone before uploading, to about this many pixels
// on the long side: sharp on a big screen, quick on a phone connection.
export const PHOTO_MAX_SIDE = 1600;
