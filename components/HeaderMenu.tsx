"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  CalendarClock,
  ChevronDown,
  Database,
  GitMerge,
  Info,
  Network,
  UserCircle,
  Users,
  ClipboardCheck,
  History,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import NotificationBell from "./NotificationBell";
import LogoutButton from "./LogoutButton";
import { useUser } from "./UserProvider";
import { getStorageUsage } from "@/app/actions/upload";

interface StorageInfo {
  usedMB: number;
  maxMB: number;
  percentage: number;
  totalFiles: number;
}

export default function HeaderMenu() {
  const { user, isAdmin } = useUser();
  const userEmail = user?.email;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch storage usage when menu opens (admin/editor only)
  const fetchStorage = useCallback(async () => {
    if (storageLoading || storage) return;
    setStorageLoading(true);
    try {
      const result = await getStorageUsage();
      if (result.success && result.usedMB !== undefined) {
        setStorage({
          usedMB: result.usedMB,
          maxMB: result.maxMB!,
          percentage: result.percentage!,
          totalFiles: result.totalFiles!,
        });
      }
    } catch {
      // Silently fail - storage info is optional
    } finally {
      setStorageLoading(false);
    }
  }, [storageLoading, storage]);

  useEffect(() => {
    if (isOpen && isAdmin && !storage) {
      fetchStorage();
    }
  }, [isOpen, isAdmin, storage, fetchStorage]);

  // Helper to format MB display
  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  // Color based on usage percentage
  const getBarColor = (pct: number) => {
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/dashboard/members"
        className="p-2 rounded-full hover:bg-stone-100 transition-colors flex items-center justify-center relative"
        title="Xem Cây Gia Phả"
      >
        <Network className="size-5 text-stone-600" />
      </Link>
      <NotificationBell />
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-stone-100 transition-all duration-200 border border-transparent hover:border-stone-200"
        >
          <div className="size-8 rounded-full bg-linear-to-br from-amber-200 to-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-sm ring-1 ring-amber-300/50">
            {userEmail ? (
              userEmail.charAt(0).toUpperCase()
            ) : (
              <UserCircle className="size-5" />
            )}
          </div>
          <ChevronDown
            className={`size-4 text-stone-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                  Tài khoản
                </p>
                <p className="text-sm font-medium text-stone-900 truncate">
                  {userEmail}
                </p>
              </div>

              {/* Storage Usage Progress Bar */}
              {isAdmin && (
                <div className="px-4 py-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="size-3.5 text-stone-400" />
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Bộ nhớ ảnh (R2)
                    </span>
                  </div>
                  {storageLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-stone-200 rounded-full animate-pulse" />
                      </div>
                      <span className="text-[10px] text-stone-400">...</span>
                    </div>
                  ) : storage ? (
                    <>
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${getBarColor(storage.percentage)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(storage.percentage, 0.5)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-semibold text-stone-500">
                          {formatSize(storage.usedMB)} / {formatSize(storage.maxMB)}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400">
                          {storage.totalFiles} files
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-stone-400">Chưa kết nối R2</p>
                  )}
                </div>
              )}

              <div className="py-1">
                {isAdmin && (
                  <>
                    <Link
                      href="/dashboard/users"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Users className="size-4" />
                      Quản lý Người dùng
                    </Link>
                    <Link
                      href="/dashboard/approvals"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <ClipboardCheck className="size-4" />
                      Phê duyệt thay đổi
                    </Link>
                    <Link
                      href="/dashboard/lineage"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Network className="size-4" />
                      Thứ tự gia phả
                    </Link>
                    <Link
                      href="/dashboard/data"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Database className="size-4" />
                      Sao lưu & Phục hồi
                    </Link>
                  </>
                )}
                <Link
                  href="/dashboard/history"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <History className="size-4" />
                  Lịch sử đề xuất
                </Link>
                <Link
                  href="/dashboard/events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <CalendarClock className="size-4" />
                  Sự kiện
                </Link>
                <Link
                  href="/dashboard/kinship"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <GitMerge className="size-4" />
                  Tra cứu danh xưng
                </Link>
                <Link
                  href="/dashboard/stats"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <BarChart2 className="size-4" />
                  Thống kê gia phả
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <Info className="size-4" />
                  Giới thiệu & Liên hệ
                </Link>
                <LogoutButton />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
