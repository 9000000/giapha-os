import { Person, Relationship } from "@/types";

export interface SpouseData {
  person: Person;
  note?: string | null;
}

export interface AdjacencyLists {
  spousesByPersonId: Map<string, SpouseData[]>;
  childrenByPersonId: Map<string, Person[]>;
}

export interface TreeFilterOptions {
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
}

/**
 * Xây dựng danh sách kề (adjacency lists) cho vợ/chồng và con cái từ dữ liệu thô.
 * Giúp tối ưu truy vấn từ O(N) xuống O(1).
 */
export function buildAdjacencyLists(
  relationships: Relationship[],
  personsMap: Map<string, Person>
): AdjacencyLists {
  const spouses = new Map<string, SpouseData[]>();
  const children = new Map<string, Person[]>();

  relationships.forEach((r) => {
    if (r.type === "marriage") {
      if (!spouses.has(r.person_a)) spouses.set(r.person_a, []);
      if (!spouses.has(r.person_b)) spouses.set(r.person_b, []);

      const pB = personsMap.get(r.person_b);
      if (pB) spouses.get(r.person_a)!.push({ person: pB, note: r.note });

      const pA = personsMap.get(r.person_a);
      if (pA) spouses.get(r.person_b)!.push({ person: pA, note: r.note });
    } else if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!children.has(r.person_a)) children.set(r.person_a, []);
      const child = personsMap.get(r.person_b);
      if (child) children.get(r.person_a)!.push(child);
    }
  });

  // Sắp xếp con cái theo thứ tự sinh hoặc năm sinh
  children.forEach((childArray) => {
    childArray.sort((a, b) => {
      const aOrder = a.birth_order ?? Infinity;
      const bOrder = b.birth_order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aYear = a.birth_year ?? Infinity;
      const bYear = b.birth_year ?? Infinity;
      return aYear - bYear;
    });
  });

  return { spousesByPersonId: spouses, childrenByPersonId: children };
}

/**
 * Lấy dữ liệu của một node trong cây (vợ chồng, con cái) đã qua bộ lọc.
 */
export function getFilteredTreeData(
  personId: string,
  personsMap: Map<string, Person>,
  adj: AdjacencyLists,
  filters: TreeFilterOptions
) {
  const { hideSpouses, hideMales, hideFemales } = filters;

  const person = personsMap.get(personId)!;

  let spousesList = adj.spousesByPersonId.get(personId) || [];
  spousesList = spousesList.filter((s) => {
    if (hideSpouses) return false;
    if (hideMales && s.person.gender === "male") return false;
    if (hideFemales && s.person.gender === "female") return false;
    return true;
  });

  let childrenList = adj.childrenByPersonId.get(personId) || [];

  // Nếu yêu cầu "ẩn dâu rể" thì đồng thời ẩn luôn hậu duệ của rể.
  // Điều này tương đương với việc ngăn không cho những người nữ "gốc" (con gái trong họ)
  // hoặc những con rể sinh ra con cái hiển thị trong sơ đồ.
  if (hideSpouses) {
    const isBiologicalFemale = person.gender === "female" && !person.is_in_law;
    const isSonInLaw = person.gender === "male" && person.is_in_law;
    if (isBiologicalFemale || isSonInLaw) {
      childrenList = [];
    }
  }

  childrenList = childrenList.filter((c) => {
    if (hideMales && c.gender === "male") return false;
    if (hideFemales && c.gender === "female") return false;
    return true;
  });

  return {
    person,
    spouses: spousesList,
    children: childrenList,
  };
}

/**
 * Tìm tất cả các thành viên cần loại trừ khỏi sự kiện/danh sách:
 * 1. Con rể (nam, is_in_law = true)
 * 2. Con của con rể (kể cả con được nhập dưới vợ rể)
 * 3. Hậu duệ đệ quy của họ
 *
 * Lưu ý: Vợ của con rể (người mang họ gia tộc) KHÔNG bị loại trừ.
 */
export function getExcludedInLawIds(
  persons: { id: string; gender?: string | null; is_in_law?: boolean | null }[],
  relationships: { person_a: string; person_b: string; type: string }[]
): Set<string> {
  const excluded = new Set<string>();

  // 1. Find all sons-in-law (male + is_in_law)
  const sonsInLaw = persons.filter(
    (p) => p.gender === "male" && p.is_in_law === true
  );
  sonsInLaw.forEach((p) => excluded.add(p.id));

  if (sonsInLaw.length === 0) return excluded;

  // 2. Build marriage map: person → list of spouse IDs
  const spouseMap = new Map<string, string[]>();
  relationships.forEach((r) => {
    if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  });

  // 3. Build parent→children map from relationships
  const childrenByParent = new Map<string, string[]>();
  relationships.forEach((r) => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childrenByParent.has(r.person_a)) childrenByParent.set(r.person_a, []);
      childrenByParent.get(r.person_a)!.push(r.person_b);
    }
  });

  // 4. Recursively add descendants of a parent
  const addDescendants = (parentId: string) => {
    const children = childrenByParent.get(parentId) || [];
    children.forEach((childId) => {
      if (!excluded.has(childId)) {
        excluded.add(childId);
        addDescendants(childId);
      }
    });
  };

  sonsInLaw.forEach((sonInLaw) => {
    // Descendants directly under the son-in-law
    addDescendants(sonInLaw.id);

    // Also add descendants listed under the spouse (wife from the family)
    // but do NOT exclude the spouse herself
    const spouses = spouseMap.get(sonInLaw.id) || [];
    spouses.forEach((spouseId) => {
      addDescendants(spouseId);
    });
  });

  return excluded;
}
