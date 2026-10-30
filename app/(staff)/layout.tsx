// The staff app's pages sit in one centered column; the public site lays out its own.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>;
}
