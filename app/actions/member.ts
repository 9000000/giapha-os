"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Verify Authentication & Authorization
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vui lòng đăng nhập." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return {
      error: "Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền xoá hồ sơ.",
    };
  }

  // 2. Check for existing relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) {
    console.error("Error checking relationships:", relationshipError);
    return { error: "Lỗi kiểm tra mối quan hệ gia đình." };
  }

  if (relationships && relationships.length > 0) {
    return {
      error:
        "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  if (profile?.role === "editor") {
    // Editor -> Create a change request instead of deleting directly
    const { error: reqError } = await supabase.from("change_requests").insert({
      action: "delete",
      target_table: "persons",
      target_record_id: memberId,
      requested_by: user.id,
      status: "pending",
    });

    if (reqError) {
      console.error("Error creating delete request:", reqError);
      return { error: "Không thể tạo yêu cầu xoá." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
    return { success: true, pending: true, message: "Yêu cầu xoá đã được gửi chờ Admin duyệt." };
  }

  // Admin -> Delete the member directly
  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    console.error("Error deleting person:", deleteError);
    return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };
  }

  // 4. Revalidate and redirect
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  redirect("/dashboard");
}
