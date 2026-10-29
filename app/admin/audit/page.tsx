import { Header } from "@/components/ui";
import { requireAdmin, type Profile, type Punch } from "@/lib/session";
import { timeLabel } from "@/lib/time";
import { displayName } from "@/lib/phone";

type Edit = {
  id: number; punch_id: string; user_id: string; editor_id: string;
  action: "add" | "edit" | "delete"; before: Punch | null; after: Punch | null; reason: string; at: string;
};

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { supabase, profile, settings } = await requireAdmin();
  const tz = settings.timezone;
  const [{ data: edits }, { data: people }] = await Promise.all([
    supabase.from("punch_edits").select("*").order("at", { ascending: false }).limit(200).returns<Edit[]>(),
    supabase.from("profiles").select("id, full_name, phone").returns<Profile[]>(),
  ]);
  const name = (id: string) => {
    const p = people?.find((x) => x.id === id);
    return p ? displayName(p) : "(removed)";
  };
  const span = (p: Punch | null) =>
    p ? `${timeLabel(p.clock_in, tz)} → ${p.clock_out ? timeLabel(p.clock_out, tz) : "open"}` : "–";

  return (
    <>
      <Header profile={profile} settings={settings} />
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">Change log</h2>
        <p className="muted mb-3 text-sm">Every manager add, fix and delete. Employees&apos; own clock-ins aren&apos;t listed.</p>
        <table className="tbl">
          <thead><tr><th>When</th><th>By</th><th>For</th><th>Action</th><th>Before</th><th>After</th><th>Reason</th></tr></thead>
          <tbody>
            {(edits ?? []).map((e) => (
              <tr key={e.id}>
                <td>{timeLabel(e.at, tz)}</td>
                <td>{name(e.editor_id)}</td>
                <td>{name(e.user_id)}</td>
                <td>{e.action}</td>
                <td className="muted">{span(e.before)}</td>
                <td>{span(e.after)}</td>
                <td>{e.reason}</td>
              </tr>
            ))}
            {!edits?.length && <tr><td colSpan={7} className="muted">No changes yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
