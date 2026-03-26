import FamilyStats from "@/components/FamilyStats";
import { getSupabase } from "@/utils/supabase/queries";
import { getExcludedInLawIds } from "@/utils/treeHelpers";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const supabase = await getSupabase();

  const [{ data: persons }, { data: relationships }] = await Promise.all([
    supabase
      .from("persons")
      .select("id, full_name, gender, birth_year, birth_month, birth_day, birth_order, generation, is_in_law, is_deceased"),
    supabase
      .from("relationships")
      .select("type, person_a, person_b"),
  ]);

  const allPersons = persons ?? [];
  const allRelationships = relationships ?? [];

  // 1. Lấy danh sách ID cần loại trừ (Rể + Hậu duệ)
  const excludedIds = getExcludedInLawIds(allPersons as any, allRelationships);

  // 2. Vì khách hàng muốn "Các thẻ khác vẫn thêm con rể chỉ bỏ hậu duệ của họ"
  // nên ta sẽ gỡ lại các ID của Rể khỏi danh sách loại trừ.
  const sonsInLawIds = allPersons
    .filter((p) => p.gender === "male" && p.is_in_law)
    .map((p) => p.id);

  sonsInLawIds.forEach((id) => excludedIds.delete(id));

  // 3. Tiến hành lọc (lúc này filteredPersons chứa tất cả trừ hậu duệ của rể)
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
          relationships={allRelationships as any}
        />
      </main>
    </div>
  );
}
