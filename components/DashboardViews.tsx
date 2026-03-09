"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import RootSelector from "@/components/RootSelector";
import { Person, Relationship } from "@/types";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";

const TreeLoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[300px]">
    <Loader2 className="size-8 text-amber-600 animate-spin" />
  </div>
);

const FamilyTree = dynamic(() => import("@/components/FamilyTree"), {
  loading: TreeLoadingFallback,
});
const MindmapTree = dynamic(() => import("@/components/MindmapTree"), {
  loading: TreeLoadingFallback,
});

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
}

export default function DashboardViews({
  persons,
  relationships,
  canEdit = false,
}: DashboardViewsProps) {
  const { view: currentView, rootId, treeBackground } = useDashboard();

  // Prepare map and roots for tree views
  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>();
    persons.forEach((p) => pMap.set(p.id, p));

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;

    // If no rootId is provided, fallback to the earliest created person
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      if (rootsFallback.length > 0) {
        finalRootId = rootsFallback[0].id;
      } else if (persons.length > 0) {
        finalRootId = persons[0].id; // ultimate fallback
      }
    }

    let calculatedRoots: Person[] = [];
    if (finalRootId && pMap.has(finalRootId)) {
      calculatedRoots = [pMap.get(finalRootId)!];
    }

    return {
      personsMap: pMap,
      roots: calculatedRoots,
      defaultRootId: finalRootId,
    };
  }, [persons, relationships, rootId]);

  const activeRootId = rootId || defaultRootId;

  // Xử lý background động
  const getBackgroundClass = () => {
    if (currentView === "list") return "bg-stone-50/50";
    // Màn hình tree và mindmap
    switch (treeBackground) {
      case "white": return "bg-white";
      case "slate": return "bg-stone-50";
      case "lotus": return "bg-lotus";
      case "tree": return "bg-tree";
      case "parchment":
      default:
        return "bg-parchment";
    }
  };

  return (
    <>
      <main
        className={`flex-1 overflow-auto flex flex-col ${getBackgroundClass()}`}
      >
        {currentView !== "list" && persons.length > 0 && activeRootId && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
            <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 min-w-0">
                <RootSelector persons={persons} currentRootId={activeRootId} />
              </div>
              <Link
                href="/dashboard/members/new"
                className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors border border-amber-500/50 shrink-0"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Thêm vào Cây</span>
                <span className="sm:hidden">Thêm</span>
              </Link>
            </div>
            <div
              id="tree-toolbar-portal"
              className="flex items-center gap-2 flex-wrap justify-center sm:ml-auto"
            />
          </div>
        )}

        {currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
            <DashboardMemberList initialPersons={persons} relationships={relationships} canEdit={canEdit} />
          </div>
        )}

        <div className="flex-1 w-full relative z-10">
          {currentView === "tree" && (
            <FamilyTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === "mindmap" && (
            <MindmapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
        </div>
      </main>
    </>
  );
}
