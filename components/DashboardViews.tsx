"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import DashboardPostsView from "@/components/DashboardPostsView";
import RootSelector from "@/components/RootSelector";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const { view: currentView, rootId, treeBackground, isToolbarVisible, setIsToolbarVisible, setPersonsCache } = useDashboard();
  const isHoveredRef = useRef(false);
  const lastYRef = useRef(0);
  const toolbarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentView === "list") {
      setIsToolbarVisible(true);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleActivity = (e?: Event) => {
      // Nếu thao tác bên trong toolbar container thì không ẩn
      if (e && toolbarContainerRef.current?.contains(e.target as Node)) {
        clearTimeout(timeoutId);
        setIsToolbarVisible(true);
        return;
      }

      if (e && (e.type === "touchstart" || e.type === "mousedown")) {
        const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        lastYRef.current = clientY;
        return;
      }

      if (e && e.type === "mousemove" && (e as MouseEvent).buttons === 0) {
        if ((e as MouseEvent).clientY < 80) {
          clearTimeout(timeoutId);
          setIsToolbarVisible(true);
          timeoutId = setTimeout(() => {
            if (!isHoveredRef.current) setIsToolbarVisible(false);
          }, 4500);
        }
        return;
      }

      let isDragging = false;
      let isPullingDown = false;

      if (e) {
        if (e.type === "touchmove") {
          const currentY = (e as TouchEvent).touches[0].clientY;
          const delta = currentY - lastYRef.current;
          if (delta > 8) {
            isDragging = true;
            isPullingDown = true;
            lastYRef.current = currentY;
          } else if (delta < -8) {
            isDragging = true;
            isPullingDown = false;
            lastYRef.current = currentY;
          }
        } else if (e.type === "wheel") {
          const deltaY = (e as WheelEvent).deltaY;
          if (deltaY < -10) {
            isDragging = true;
            isPullingDown = true;
          } else if (deltaY > 10) {
            isDragging = true;
            isPullingDown = false;
          }
        } else if (e.type === "mousemove" && (e as MouseEvent).buttons > 0) {
          const currentY = (e as MouseEvent).clientY;
          const delta = currentY - lastYRef.current;
          if (delta > 8) {
            isDragging = true;
            isPullingDown = true;
            lastYRef.current = currentY;
          } else if (delta < -8) {
            isDragging = true;
            isPullingDown = false;
            lastYRef.current = currentY;
          }
        }
      }

      if (isDragging) {
        clearTimeout(timeoutId);
        if (isPullingDown) {
          setIsToolbarVisible(true);
          timeoutId = setTimeout(() => {
            if (!isHoveredRef.current) setIsToolbarVisible(false);
          }, 4500);
        } else {
          setIsToolbarVisible(false);
        }
      }
    };

    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("touchmove", handleActivity);
    window.addEventListener("wheel", handleActivity);

    // Initial timeout cho trạng thái chưa thao tác
    timeoutId = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 3000);

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("touchmove", handleActivity);
      window.removeEventListener("wheel", handleActivity);
      clearTimeout(timeoutId);
    };
  }, [currentView, setIsToolbarVisible]);

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

  // Sync persons cache to context for instant modal display
  useEffect(() => {
    setPersonsCache(personsMap);
  }, [personsMap, setPersonsCache]);

  // Xử lý background động
  const getBackgroundClass = () => {
    // Màn hình tree, mindmap và list
    switch (treeBackground) {
      case "white": return "bg-white";
      case "slate": return "bg-stone-50";
      case "lotus": return "bg-lotus";
      case "tree": return "bg-tree";
      case "red": return "bg-red";
      case "parchment":
      default:
        return "bg-parchment";
    }
  };

  return (
    <>
      <main
        className={`flex-1 overflow-auto flex flex-col relative ${getBackgroundClass()}`}
      >
        {persons.length > 0 && activeRootId && (
          <div 
            ref={toolbarContainerRef}
            className={`absolute top-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-3 z-40 pointer-events-none transition-all duration-500 ${
              currentView === "list" || isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
            onMouseEnter={() => {
              isHoveredRef.current = true;
              setIsToolbarVisible(true);
            }}
            onMouseLeave={() => {
              isHoveredRef.current = false;
            }}
          >
            {currentView !== "list" ? (
              <div className={`flex flex-row items-center gap-3 w-full sm:w-auto relative z-50 transition-colors flex-1 ${isToolbarVisible ? "pointer-events-auto" : "pointer-events-none"}`}>
                <div className="flex-1 min-w-0 sm:flex-none">
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
            ) : (
              <div className="hidden sm:block w-full sm:w-auto flex-1" />
            )}

            <div className={`w-full sm:w-auto flex justify-end relative z-30 transition-colors sm:ml-auto ${currentView === "list" || isToolbarVisible ? "pointer-events-auto" : "pointer-events-none"}`}>
              <ViewToggle />
            </div>

            <div
              id="tree-toolbar-portal"
              className={`w-full flex items-center gap-2 flex-wrap justify-center sm:justify-end relative z-40 transition-colors order-last ${isToolbarVisible ? "pointer-events-auto" : "pointer-events-none"}`}
            />
          </div>
        )}

        {currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 w-full relative z-10">
            <DashboardMemberList initialPersons={persons} relationships={relationships} canEdit={canEdit} />
          </div>
        )}

        {currentView === "posts" && (
          <div className="pt-20 w-full relative z-10">
            <DashboardPostsView isAdmin={canEdit} />
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
