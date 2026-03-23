"use client";

import { motion } from "framer-motion";
import { List, ListTree, Network } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export type ViewMode = "list" | "tree" | "mindmap";

export default function ViewToggle() {
  const { view: currentView, setView, isToolbarVisible, setIsToolbarVisible } = useDashboard();

  const tabs = [
    {
      id: "list",
      label: "Danh sách",
      icon: <List className="size-6 sm:size-4" />,
    },
    {
      id: "tree",
      label: "Sơ đồ cây",
      icon: <Network className="size-6 sm:size-4" />,
    },
    {
      id: "mindmap",
      label: "Mindmap",
      icon: <ListTree className="size-6 sm:size-4" />,
    },
  ] as const;

  return (
    <div 
      className={`absolute top-3 left-1/2 -translate-x-1/2 flex bg-stone-200/50 p-1 rounded-full shadow-inner w-fit mx-auto border border-stone-200/60 backdrop-blur-sm z-30 transition-all duration-500 ${
        isToolbarVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
      onMouseEnter={() => setIsToolbarVisible(true)}
    >
      {tabs.map((tab) => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as ViewMode)}
            className={`relative px-3 sm:px-5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 ease-in-out z-10 flex items-center gap-1.5 ${isActive
              ? "text-stone-900"
              : "text-stone-500 hover:text-stone-800"
              }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-full shadow-sm border border-stone-200/60 z-[-1]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <span
              className={`transition-colors duration-300 ${isActive ? "text-amber-700" : "text-stone-400"}`}
            >
              {tab.icon}
            </span>
            <span className="hidden sm:block tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
