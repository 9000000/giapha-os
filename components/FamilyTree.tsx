"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { usePanZoom } from "@/hooks/usePanZoom";
import { Person, Relationship } from "@/types";
import { useDashboard } from "./DashboardContext";
import FamilyNodeCard from "./FamilyNodeCard";
import TreeToolbar from "./TreeToolbar";

import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideSpouses, setHideSpouses] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [expandedInLawNodes, setExpandedInLawNodes] = useState<Set<string>>(new Set());

  const { showAvatar } = useDashboard();

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  } = usePanZoom(containerRef);

  useEffect(() => {
    // Center the scroll area horizontally on initial render
    if (containerRef.current) {
      const el = containerRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [roots]);

  useEffect(() => {
    const equalizeSizes = () => {
      if (!containerRef.current) return;

      const cards = containerRef.current.querySelectorAll<HTMLElement>(".family-card");
      if (cards.length === 0) return;

      // Reset all sizes first to get natural dimensions
      cards.forEach((card) => {
        card.style.minWidth = "";
        card.style.minHeight = "";
      });

      // Find the global max width and height across ALL cards (excluding root if needed for base measurement)
      let globalMaxW = 0;
      let globalMaxH = 0;
      cards.forEach((card) => {
        if (!card.classList.contains("root-card")) {
          globalMaxW = Math.max(globalMaxW, card.offsetWidth);
        }
        globalMaxH = Math.max(globalMaxH, card.offsetHeight);
      });

      // If no normal cards, use root's natural width as base/3 or just measure all
      if (globalMaxW === 0) {
        cards.forEach(card => {
          globalMaxW = Math.max(globalMaxW, card.offsetWidth);
        });
      }

      // Apply global max to ALL cards
      if (globalMaxW > 0 && globalMaxH > 0) {
        cards.forEach((card) => {
          if (card.classList.contains("root-card")) {
            card.style.minWidth = `${globalMaxW * 3}px`;
          } else {
            card.style.minWidth = `${globalMaxW}px`;
          }
          card.style.minHeight = `${globalMaxH}px`;
        });
      }
    };

    // Run multiple times to account for image loading and layout shifts
    const timer1 = setTimeout(equalizeSizes, 50);
    const timer2 = setTimeout(equalizeSizes, 300);
    const timer3 = setTimeout(equalizeSizes, 1000);

    window.addEventListener("resize", equalizeSizes);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", equalizeSizes);
    };
  }, [
    roots,
    personsMap,
    relationships,
    showAvatar,
    hideSpouses,
    hideMales,
    hideFemales,
    expandedInLawNodes,
  ]);

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  const treeNodes = useMemo(() => {
    const getTreeData = (personId: string) =>
      getFilteredTreeData(personId, personsMap, adj, {
        hideSpouses,
        hideMales,
        hideFemales,
      });

    // Recursive function for rendering nodes
    // Tracks visited IDs to prevent infinite loops from circular relationships
    const renderTreeNode = (
      personId: string,
      visited: Set<string> = new Set(),
      level: number = 0,
    ): React.ReactNode => {
      if (visited.has(personId)) return null; // cycle guard
      visited.add(personId);

      const data = getTreeData(personId);
      if (!data.person) return null;

      const isHusbandInLaw = data.spouses.some(s => s.person.gender === "male" && s.person.is_in_law);
      const selfIsHusbandInLaw = data.person.gender === "male" && data.person.is_in_law;
      const hasInLawHusband = isHusbandInLaw || selfIsHusbandInLaw;
      const hasChildren = data.children.length > 0;
      const isExpanded = expandedInLawNodes.has(personId);
      const shouldShowChildren = !hasInLawHusband || isExpanded;

      return (
        <li>
          <div
            className="node-container inline-flex flex-col items-center relative"
            data-level={level}
          >
            {/* Main Person & Spouses Row */}
            <div
              className={`flex relative z-10 items-stretch h-full transition-opacity ${data.spouses.length > 0
                ? "rounded-[9px] border-2 border-yellow-400 bg-yellow-50 shadow-md"
                : showAvatar
                  ? "bg-yellow-100 rounded-[7px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-amber-300/80"
                  : ""
                }`}
            >
              <FamilyNodeCard person={data.person} level={level} isRoot={level === 0} />

              {data.spouses.length > 0 &&
                data.spouses.map((spouseData, idx) => (
                  <div key={spouseData.person.id} className="flex relative">
                    <FamilyNodeCard
                      isRingVisible={idx === 0}
                      isPlusVisible={idx > 0}
                      person={spouseData.person}
                      role={spouseData.person.gender === "male" ? "Chồng" : "Vợ"}
                      note={spouseData.note}
                      level={level}
                    />
                  </div>
                ))}
            </div>

            {hasInLawHusband && hasChildren && (
              <div className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 z-20">
                <button
                  onMouseDown={(e) => {
                    // Ngăn chặn sự kiện kéo (pan) của sơ đồ khi click vào nút 
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedInLawNodes(prev => {
                      const next = new Set(prev);
                      if (next.has(personId)) next.delete(personId);
                      else next.add(personId);
                      return next;
                    });
                  }}
                  className="bg-white border border-stone-200 rounded-full p-0.5 text-stone-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 focus:outline-none shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all flex items-center justify-center cursor-pointer"
                  title={isExpanded ? "Ẩn danh sách con" : "Xem danh sách con"}
                >
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Render Children (if any) */}
          {shouldShowChildren && hasChildren && (
            <ul>
              {data.children.map((child) => (
                <React.Fragment key={child.id}>
                  {renderTreeNode(child.id, new Set(visited), level + 1)}
                </React.Fragment>
              ))}
            </ul>
          )}
        </li>
      );
    };

    return roots.map((root) => (
      <React.Fragment key={root.id}>
        {renderTreeNode(root.id)}
      </React.Fragment>
    ));
  }, [
    roots,
    personsMap,
    adj,
    hideSpouses,
    hideMales,
    hideFemales,
    showAvatar,
    expandedInLawNodes,
  ]);

  if (roots.length === 0)
    return (
      <div className="text-center p-10 text-stone-500">
        Không tìm thấy dữ liệu.
      </div>
    );

  return (
    <div className="w-full h-full relative">
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        hideSpouses={hideSpouses}
        setHideSpouses={setHideSpouses}
        hideMales={hideMales}
        setHideMales={setHideMales}
        hideFemales={hideFemales}
        setHideFemales={setHideFemales}
        canEdit={canEdit}
      />

      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto ${isPressed ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // Prevent browser default dragging of links/images
      >
        {/* 
        Use w-max to prevent wrapping and allow scrolling. 
        mx-auto centers it if smaller than screen. 
        p-8 adds padding inside scroll area.
      */}
        <div
          id="export-container"
          className={`w-max min-w-full mx-auto p-4 pt-16 css-tree transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <ul>
            {treeNodes}
          </ul>
        </div>
      </div>
    </div>
  );
}
