import FamilyStats from "@/components/FamilyStats";
import { getSupabase } from "@/utils/supabase/queries";
import { getExcludedInLawIds } from "@/utils/treeHelpers";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const supabase = await getSupabase();

  const { data: persons } = await supabase.from("persons").select("*");
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*");

  const allPersons = persons ?? [];
  const allRelationships = relationships ?? [];

  // Loại bỏ con rể và hậu duệ của họ trước khi thống kê (giống danh sách)
  const excludedIds = getExcludedInLawIds(allPersons as any, allRelationships);
  const filteredPersons = allPersons.filter((p) => !excludedIds.has(p.id));

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="title">Thống kê gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats
          persons={filteredPersons as any}
          relationships={allRelationships}
        />
      </main>
    </div>
  );
}
