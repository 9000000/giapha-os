"use client";

import { Person } from "@/types";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";

interface FamilyNodeCardProps {
  person: Person;
  role?: string; // e.g., "Chồng", "Vợ"
  note?: string | null;
  onClickCard?: () => void;
  onClickName?: (e: React.MouseEvent) => void;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isRingVisible?: boolean;
  isPlusVisible?: boolean;
  level: number;
  isRoot?: boolean;
}

export default function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isExpandable = false,
  isExpanded = false,
  isRingVisible = false,
  isPlusVisible = false,
  isRoot = false,
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useDashboard();

  const isDeceased = person.is_deceased;

  // Chẻ tên thành các dòng dài tối đa 2 từ để tên xếp dọc vừa vặn
  const nameRows: string[] = [];
  const words = person.full_name.split(" ");
  for (let i = 0; i < words.length; i += 2) {
    nameRows.push(words.slice(i, i + 2).join(" "));
  }

  const content = (
    <div
      onClick={onClickCard}
      className={`
        group py-1 flex flex-col items-center ${showAvatar ? "justify-start" : "justify-center"} relative h-full rounded-[7px]
        ${showAvatar
          ? `family-card ${isRoot ? "root-card" : ""} px-0 sm:px-0 w-fit bg-yellow-100 border border-amber-300/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]`
          : `family-card ${isRoot ? "root-card" : ""} px-0 bg-yellow-100 border border-amber-400/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]`
        }
      `}
    >
      {isRingVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">💍</span>
        </div>
      )}
      {isPlusVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500
            ${showAvatar ? "shadow-sm bg-white" : ""}
          `}
        >
          <span className="leading-none">+</span>
        </div>
      )}

      {/* Expand/Collapse Indicator */}
      {isExpandable && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-stone-200/80 rounded-full size-6 flex items-center justify-center shadow-md z-100 text-stone-500 hover:text-amber-600 transition-colors">
          {isExpanded ? (
            <Minus className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className="relative z-10 mb-1 sm:mb-1.5">
          <div
            className={`
              h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm text-white overflow-hidden shrink-0 shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105
              ${isDeceased ? "grayscale-[0.6] opacity-95" : ""}
              ${person.gender === "male"
                ? "bg-linear-to-br from-sky-400 to-sky-700"
                : person.gender === "female"
                  ? "bg-linear-to-br from-rose-400 to-rose-700"
                  : "bg-linear-to-br from-stone-400 to-stone-600"
              }
            `}
          >
            {person.avatar_url ? (
              <Image
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
                width={256}
                height={256}
                quality={95}
              />
            ) : (
              <DefaultAvatar gender={person.gender} />
            )}
          </div>
        </div>
      )}

      {/* 2. Gender Icon + Name */}
      <div className={`flex flex-col items-center gap-1 w-full relative z-10 ${showAvatar ? "px-0 justify-center" : "flex-1 justify-evenly px-1"}`}>
        <div
          className={`
            font-bold text-center leading-[1.2] transition-colors cursor-pointer break-words w-full px-0.5
            ${showAvatar ? "text-[10px] sm:text-[11px] md:text-[11px]" : "text-xs sm:text-[13px] tracking-tight"}
            ${onClickName ? "text-stone-800 group-hover:text-amber-700 hover:underline" : "text-stone-800 group-hover:text-amber-800"}
          `}
          title={person.full_name}
          onClick={(e) => {
            if (onClickName) {
              e.stopPropagation();
              e.preventDefault();
              onClickName(e);
            }
          }}
        >
          {showAvatar
            ? nameRows.map((row, i) => (
              <span key={i} className="block">
                {row}
              </span>
            ))
            : words.map((word, i) => (
              <span key={i} className="block">
                {word}
              </span>
            ))}
        </div>
      </div>
    </div>
  );

  if (onClickCard || onClickName) {
    return content;
  }

  return (
    <button onClick={() => setMemberModalId(person.id)} className="block w-fit">
      {content}
    </button>
  );
}
