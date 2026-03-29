"use client";

import MemberDetailContent from "@/components/MemberDetailContent";
import MemberForm from "@/components/MemberForm";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Edit2, ExternalLink, Info, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { useUser } from "./UserProvider";

export default function MemberDetailModal() {
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember,
    personsCache,
  } = useDashboard();
  const { isAdmin, isEditor: canEdit, supabase } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPendingCreate, setIsPendingCreate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{ action: string }[] | null>(null);

  const closeModal = () => {
    setMemberModalId(null);
    setShowCreateMember(false);
    setIsEditing(false);
    setIsPendingCreate(false);
  };

  const fetchData = useCallback(
    async (id: string) => {
      // Try instant display from cache first
      const cached = personsCache.get(id);
      if (cached) {
        setPerson(cached);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        // Build queries — skip person query if we have cache
        const personQuery = cached
          ? null
          : supabase
            .from("persons")
            .select("*")
            .eq("id", id)
            .single();

        const privateQuery = isAdmin
          ? supabase
            .from("person_details_private")
            .select("*")
            .eq("person_id", id)
            .single()
          : null;

        const pendingQuery = supabase
          .from("change_requests")
          .select("action")
          .eq("target_table", "persons")
          .eq("target_record_id", id)
          .eq("status", "pending");

        const [personResult, privateResult, pendingResult] = await Promise.all([
          personQuery,
          privateQuery,
          pendingQuery,
        ]);

        // Update person from DB if we fetched it (or if cache was used, keep cached version)
        if (personResult && !personResult.error && personResult.data) {
          setPerson(personResult.data);
        } else if (!cached && personResult?.error) {
          throw new Error("Không thể tải thông tin thành viên.");
        }
        setPrivateData(isAdmin ? (privateResult?.data || {}) : null);
        setPendingRequests(pendingResult.data || null);
      } catch (err) {
        console.error("Error fetching member details:", err);
        // @ts-expect-error - err is caught as unknown, but we check for message
        setError(err?.message || "Đã xảy ra lỗi hệ thống.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, supabase, personsCache],
  );

  // Sync state with URL parameter or create mode
  useEffect(() => {
    if (memberId) {
      setIsOpen(true);
      setIsEditing(false); // always start on detail view when opening
      setIsPendingCreate(false);
      fetchData(memberId);
    } else if (showCreateMember) {
      setIsOpen(true);
      setIsEditing(false);
      setIsPendingCreate(false);
      setPerson(null);
      setPrivateData(null);
      setError(null);
    } else if (!isPendingCreate) {
      setIsOpen(false);
      setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
      }, 300);
    }
  }, [memberId, showCreateMember, isPendingCreate, fetchData]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Called by MemberForm after a successful save
  const handleEditSuccess = (savedPersonId: string) => {
    // Clear stale data first so the loading state is shown while refetching
    setIsEditing(false);
    setPerson(null);
    setPrivateData(null);
    fetchData(savedPersonId);
    // Revalidate Next.js server component cache so the dashboard list/members updates
    router.refresh();
  };

  // Called by MemberForm after a successful CREATE
  const handleCreateSuccess = (savedPersonId: string) => {
    if (savedPersonId === 'pending_create') {
      setIsPendingCreate(true);
      setShowCreateMember(false);
      return;
    }
    setShowCreateMember(false);
    // Open the detail modal for the new member
    setMemberModalId(savedPersonId);
    // Delay refresh so React commits state changes first,
    // ensuring the server component re-fetches the updated member list.
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  // initialData for MemberForm — merge public + private
  const formInitialData = person
    ? { ...person, ...(privateData ?? {}) }
    : undefined;

  const isPendingUpdate = pendingRequests?.some((r) => r.action === "update");
  const isPendingDelete = pendingRequests?.some((r) => r.action === "delete");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/50"
        >
          {/* Click-away backdrop (disabled while editing/creating to avoid accidental close) */}
          {!isEditing && !showCreateMember && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={closeModal}
            />
          )}

          {/* Modal Content */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) closeModal();
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Mobile Drag Handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-stone-200 rounded-full opacity-50 block sm:hidden z-30" />

            {/* Sticky Header Actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing ? (
                /* In edit mode — show back button */
                <button
                  onClick={() => {
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Quay lại</span>
                </button>
              ) : (
                canEdit &&
                person && (
                  <>
                    <Link
                      href={`/dashboard/members/${person.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      <span className="hidden sm:inline">Xem chi tiết</span>
                    </Link>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <Edit2 className="size-4" />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </button>
                  </>
                )
              )}
              <button
                onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4">
                <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 font-medium">Đang tải...</p>
              </div>
            ) : error ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <AlertCircle className="size-8" />
                </div>
                <p className="text-red-600 font-medium text-lg">{error}</p>
                <button
                  onClick={closeModal}
                  className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : isEditing && formInitialData ? (
              /* ── EDIT MODE ── */
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                {(isPendingUpdate || isPendingDelete) && (
                  <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                    <div className="p-2 bg-amber-100/80 text-amber-600 rounded-lg shrink-0 mt-0.5">
                      <Info className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                        Cảnh báo: Hồ sơ đang chờ phê duyệt
                      </h3>
                      <p className="text-sm font-medium text-amber-700/80 mt-1">
                        {isPendingDelete
                          ? "Người này đang có yêu cầu XOÁ chờ Quản trị viên duyệt. Chỉnh sửa của bạn có thể vô nghĩa nếu hồ sơ bị xoá."
                          : "Đã có yêu cầu cập nhật chờ duyệt cho người này. Việc bạn gửi yêu cầu chỉnh sửa mới có thể sẽ ghi đè lên yêu cầu trước đó."}
                      </p>
                    </div>
                  </div>
                )}
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Chỉnh sửa thành viên
                </h2>
                <MemberForm
                  initialData={
                    formInitialData as Parameters<
                      typeof MemberForm
                    >[0]["initialData"]
                  }
                  isEditing={true}
                  isAdmin={isAdmin}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : isPendingCreate ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                  <div className="p-2 bg-amber-100/80 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <Info className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                      HỒ SƠ ĐANG CHỜ PHÊ DUYỆT
                    </h3>
                    <p className="text-sm font-medium text-amber-700/80 mt-1">
                      Yêu cầu thêm thành viên mới đã được gửi. Thông tin người này đang chờ Quản trị viên duyệt và áp dụng vào gia phả.
                    </p>
                  </div>
                </div>
                <div className="flex justify-center mt-8">
                  <button onClick={closeModal} className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors">
                    Đóng
                  </button>
                </div>
              </div>
            ) : showCreateMember ? (
              /* ── CREATE MODE ── */
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Thêm thành viên mới
                </h2>
                <MemberForm
                  isAdmin={isAdmin}
                  onSuccess={handleCreateSuccess}
                  onCancel={closeModal}
                />
              </div>
            ) : person ? (
              /* ── DETAIL MODE ── */
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {(isPendingUpdate || isPendingDelete) && (
                  <div className="m-4 sm:m-6 sm:mb-0 mb-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                    <div className="p-2 bg-amber-100/80 text-amber-600 rounded-lg shrink-0 mt-0.5">
                      <Info className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                        Hồ sơ đang chờ phê duyệt
                      </h3>
                      <p className="text-sm font-medium text-amber-700/80 mt-1">
                        {isPendingDelete
                          ? "Người dùng này đang có yêu cầu XOÁ chờ Quản trị viên phê duyệt."
                          : "Thông tin cập nhật mới đang chờ Quản trị viên duyệt và áp dụng."}
                      </p>
                    </div>
                  </div>
                )}
                <MemberDetailContent
                  person={person}
                  privateData={privateData}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
