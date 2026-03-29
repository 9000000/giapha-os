import DeleteMemberButton from "@/components/DeleteMemberButton";
import MemberDetailContent from "@/components/MemberDetailContent";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params;

  const profile = await getProfile();

  const isAdmin = profile?.role === "admin";
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const supabase = await getSupabase();

  // Fetch Person Public Data
  const { data: person, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !person) {
    notFound();
  }

  // Fetch Private Data if Admin
  let privateData = null;
  if (isAdmin) {
    const { data } = await supabase
      .from("person_details_private")
      .select("*")
      .eq("person_id", id)
      .single();
    privateData = data;
  }

  // Check for pending change requests
  const { data: pendingRequests } = await supabase
    .from("change_requests")
    .select("action")
    .eq("target_table", "persons")
    .eq("target_record_id", id)
    .eq("status", "pending");

  const isPendingUpdate = pendingRequests?.some((r) => r.action === "update");
  const isPendingDelete = pendingRequests?.some((r) => r.action === "delete");

  return (
    <div className="flex-1 w-full relative flex flex-col pb-8">
      {/* Decorative background blurs */}
      {/* <div className="absolute -top-[20%] left-0 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" /> */}
      {/* <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="w-full relative z-20 py-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/members"
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="title">Chi Tiết Thành Viên</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2.5">
            <Link
              href={`/dashboard/members/${id}/edit`}
              className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
            >
              Chỉnh sửa
            </Link>
            <DeleteMemberButton memberId={id} />
          </div>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 w-full flex-1">
        {(isPendingUpdate || isPendingDelete) && (
          <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
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

        <div className="bg-white/60 rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <MemberDetailContent
            person={person}
            privateData={privateData}
            isAdmin={isAdmin}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  );
}
