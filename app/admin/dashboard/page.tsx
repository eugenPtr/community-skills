import { redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import { AdminInviteTable } from "@/components/admin-invite-table";
import { listInvites, supabaseListInvitesClient } from "@/lib/invites/list";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

// The shared Admin Dashboard (issue #20, ADR-0007). Server component: it gates
// on the caller being an Admin, then reads every invite via the service-role
// client (bypassing RLS). The table itself is a client component (clipboard +
// hover affordances live on the browser).
export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Admin gate beyond hiding the menu item: an authenticated non-Admin who
  // navigates here directly is sent home (silent, mirroring the member gate).
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const service = createSupabaseServiceClient();
  const invites = await listInvites(supabaseListInvitesClient(service));

  return (
    <>
      <AuthedMenu isAdmin />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-white">Every invite in the network.</p>
        <AdminInviteTable invites={invites} />
      </main>
    </>
  );
}
