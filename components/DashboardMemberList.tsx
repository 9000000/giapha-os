"use client";

import PersonCard from "@/components/PersonCard";
import { Person, Relationship } from "@/types";
import { getExcludedInLawIds } from "@/utils/treeHelpers";
import { ArrowUpDown, Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboard } from "./DashboardContext";

export default function DashboardMemberList({
  initialPersons,
  relationships,
  canEdit = false,
}: {
  initialPersons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
}) {
  const { setShowCreateMember } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("generation_desc");

  const [filterOption, setFilterOption] = useState("all");

  // Tính các ID cần loại trừ (con rể + hậu duệ của họ)
  const excludedIds = useMemo(() => {
    return getExcludedInLawIds(initialPersons, relationships);
  }, [initialPersons, relationships]);

  const filteredPersons = useMemo(() => {
    return initialPersons.filter((person) => {
      const matchesSearch = person.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      const isExcludedInLawLine = excludedIds.has(person.id);

      switch (filterOption) {
        case "male":
          matchesFilter = person.gender === "male" && !person.is_in_law && !isExcludedInLawLine;
          break;
        case "female":
          matchesFilter = person.gender === "female" && !person.is_in_law && !isExcludedInLawLine;
          break;
        case "in_law_female":
          matchesFilter = person.gender === "female" && person.is_in_law === true;
          break;
        case "in_law_male":
          // Hiển thị con rể nếu người dùng chọn đúng bộ lọc "Rể"
          matchesFilter = person.gender === "male" && person.is_in_law === true;
          break;
        case "deceased":
          matchesFilter = !!person.is_deceased && !person.is_in_law && !isExcludedInLawLine;
          break;
        case "first_child":
          matchesFilter = person.birth_order === 1 && !person.is_in_law && !isExcludedInLawLine;
          break;
        case "all":
        default:
          // Ẩn con rể và hậu duệ của họ theo mặc định trong chế độ "Tất cả", nhưng vẫn hiển thị con dâu
          matchesFilter = (!person.is_in_law || person.gender === "female") && !isExcludedInLawLine;
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [initialPersons, searchTerm, filterOption, excludedIds]);

  const sortedPersons = useMemo(() => {
    return [...filteredPersons].sort((a, b) => {
      switch (sortOption) {
        case "birth_asc":
          return (a.birth_year || 9999) - (b.birth_year || 9999);
        case "birth_desc":
          return (b.birth_year || 0) - (a.birth_year || 0);
        case "name_asc":
          return a.full_name.localeCompare(b.full_name, "vi");
        case "name_desc":
          return b.full_name.localeCompare(a.full_name, "vi");
        case "updated_desc":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
        case "updated_asc":
          return (
            new Date(a.updated_at || 0).getTime() -
            new Date(b.updated_at || 0).getTime()
          );
        case "generation_asc":
          if (a.generation !== b.generation) {
            return (a.generation || 999) - (b.generation || 999);
          }
          return (a.birth_order || 999) - (b.birth_order || 999);
        case "generation_desc":
          if (b.generation !== a.generation) {
            return (b.generation || 0) - (a.generation || 0);
          }
          return (b.birth_order || 0) - (a.birth_order || 0);
        default:
          return 0;
      }
    });
  }, [filteredPersons, sortOption]);

  return (
    <>
      <div className="mb-6 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl shadow-md border border-stone-200 transition-all duration-300 relative z-10 w-full">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                className="bg-white text-stone-900 w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-200/80 shadow-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
              <div className="relative w-full sm:w-auto">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                <select
                  className="appearance-none bg-white text-stone-700 w-full sm:w-36 pl-8 pr-7 py-1.5 rounded-lg border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all"
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="in_law_female">Dâu</option>
                  <option value="in_law_male">Rể</option>
                  <option value="deceased">Đã mất</option>
                  <option value="first_child">Con trưởng</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none">
                  <svg
                    className="size-3.5 text-stone-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>

              <div className="relative w-full sm:w-auto">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400 pointer-events-none" />
                <select
                  className="appearance-none bg-white text-stone-700 w-full sm:w-48 pl-8 pr-7 py-1.5 rounded-lg border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="birth_asc">Năm sinh (Tăng dần)</option>
                  <option value="birth_desc">Năm sinh (Giảm dần)</option>
                  <option value="name_asc">Tên (A-Z)</option>
                  <option value="name_desc">Tên (Z-A)</option>
                  <option value="updated_desc">Cập nhật (Mới nhất)</option>
                  <option value="updated_asc">Cập nhật (Cũ nhất)</option>
                  <option value="generation_asc">Theo thế hệ (Tăng dần)</option>
                  <option value="generation_desc">
                    Theo thế hệ (Giảm dần)
                  </option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none">
                  <svg
                    className="size-3.5 text-stone-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreateMember(true)}
              className="btn-primary"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Thêm thành viên
            </button>
          )}
        </div>
      </div>

      {sortedPersons.length > 0 ? (
        sortOption.startsWith("generation") ? (
          <div className="space-y-12">
            {(Object.entries(
              sortedPersons.reduce((acc: Record<number, Person[]>, person: Person) => {
                const gen = person.generation || 0;
                if (!acc[gen]) acc[gen] = [];
                acc[gen].push(person);
                return acc;
              }, {} as Record<number, Person[]>)
            ) as [string, Person[]][])
              .sort(([a], [b]) =>
                sortOption === "generation_asc"
                  ? Number(a) - Number(b)
                  : Number(b) - Number(a)
              )
              .map(([gen, persons]) => (
                <div key={`gen-${gen}`}>
                  <div className="flex items-center justify-center mb-8">
                    <div className="flex-grow border-t border-amber-200/60"></div>
                    <span className="mx-4 px-6 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-semibold text-sm shadow-sm whitespace-nowrap">
                      {Number(gen) === 0 ? "Chưa xác định đời" : `Đời thứ ${gen}`}
                    </span>
                    <div className="flex-grow border-t border-amber-200/60"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {persons.map((person) => (
                      <PersonCard key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPersons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-stone-400 italic">
          {initialPersons.length > 0
            ? "Không tìm thấy thành viên phù hợp."
            : "Chưa có thành viên nào. Hãy thêm thành viên đầu tiên."}
        </div>
      )}
    </>
  );
}
