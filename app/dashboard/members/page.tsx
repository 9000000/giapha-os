import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { getProfile, getSupabase } from "@/utils/supabase/queries";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}
export default async function FamilyTreePage({ searchParams }: PageProps) {
  await searchParams;

  const supabase = await getSupabase();

  const [profile, personsRes, relsRes] = await Promise.all([
    getProfile(),
    supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false }),
    supabase.from("relationships").select("*"),
  ]);

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const persons = personsRes.data || [];
  const relationships = relsRes.data || [];

  return (
    <DashboardProvider>
      <div className="relative flex-1 flex flex-col h-full w-full overflow-hidden">
        <ViewToggle />
        <DashboardViews
          persons={persons}
          relationships={relationships}
          canEdit={canEdit}
        />
        <MemberDetailModal />
      </div>
    </DashboardProvider>
  );
}
