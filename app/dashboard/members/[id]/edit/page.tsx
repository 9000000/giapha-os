import MemberForm from "@/components/MemberForm";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;

  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  const isEditor = profile?.role === "editor";
  if (!isAdmin && !isEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">
            Truy cập bị từ chối
          </h1>
          <p className="text-stone-600 mt-2">
            Bạn không có quyền chỉnh sửa thành viên.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await getSupabase();

  // Fetch Public Data
  const { data: person, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !person) {
    notFound();
  }

  // Fetch Private Data (only for admin)
  let privateData = null;
  if (isAdmin) {
    const { data } = await supabase
      .from("person_details_private")
      .select("*")
      .eq("person_id", id)
      .single();
    privateData = data;
  }

  const initialData = isAdmin ? { ...person, ...privateData } : { ...person };

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
      {/* <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[120px] pointer-events-none" /> */}
      {/* <div className="absolute top-[40%] -right-[10%] w-[400px] h-[400px] bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="w-full relative z-20 py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/members/${id}`}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="title">Chỉnh Sửa Thành Viên</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 w-full flex-1">
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

        <MemberForm initialData={initialData} isEditing={true} isAdmin={isAdmin} />
      </main>
    </div>
  );
}
