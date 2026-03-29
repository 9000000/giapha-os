"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type ActionType = "insert" | "update" | "delete";
export type RequestStatus = "pending" | "approved" | "rejected";

export async function createChangeRequest(
    action: ActionType,
    target_table: string,
    target_record_id: string | null,
    new_data: any = null,
    old_data: any = null
) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Vui lòng đăng nhập." };
    }

    const { error } = await supabase.from("change_requests").insert({
        action,
        target_table,
        target_record_id,
        new_data,
        old_data,
        requested_by: user.id,
        status: "pending",
    });

    if (error) {
        console.error("Error creating change request:", error);
        return { error: "Không thể gửi yêu cầu thay đổi lúc này." };
    }

    return { success: true };
}

export async function approveChangeRequest(requestId: string) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Verify admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Vui lòng đăng nhập." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { error: "Từ chối truy cập. Chỉ Admin mới có quyền duyệt." };
    }

    // 2. Fetch request details
    const { data: request, error: reqError } = await supabase
        .from("change_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (reqError || !request) {
        return { error: "Không tìm thấy yêu cầu này." };
    }

    if (request.status !== "pending") {
        return { error: "Yêu cầu này đã được xử lý trước đó." };
    }

    // 3. Apply changes to the target table
    let applyError = null;
    let oldAvatarUrl: string | null = null;
    let newAvatarUrl: string | null = null;

    if (request.target_table === "persons") {
        newAvatarUrl = request.new_data?.avatar_url || null;
        if (request.action === "update" && request.old_data?.avatar_url) {
            oldAvatarUrl = request.old_data.avatar_url;
        } else if (request.action === "delete") {
            // Fetch before delete
            if (request.target_record_id) {
                const { data: recordData } = await supabase
                    .from("persons")
                    .select("avatar_url")
                    .eq("id", request.target_record_id)
                    .single();
                oldAvatarUrl = recordData?.avatar_url || null;
            }
        }
    }

    if (request.action === "insert") {
        // Check if the record already exists (e.g., Editor created a post with 'pending' status)
        const recordId = request.target_record_id || request.new_data?.id;
        let recordExists = false;

        if (recordId) {
            const { data: existing } = await supabase
                .from(request.target_table)
                .select("id")
                .eq("id", recordId)
                .maybeSingle();
            recordExists = !!existing;
        }

        if (recordExists) {
            // Record already exists — update it instead of inserting again
            const { error } = await supabase
                .from(request.target_table)
                .update(request.new_data)
                .eq("id", recordId);
            applyError = error;
        } else {
            // Normal insert for records that don't exist yet
            const dataToInsert = request.target_record_id
                ? { ...request.new_data, id: request.target_record_id }
                : request.new_data;

            const { error } = await supabase
                .from(request.target_table)
                .insert(dataToInsert);
            applyError = error;
        }
    } else if (request.action === "update") {
        if (!request.target_record_id) {
            return { error: "Thiếu ID bản ghi cần cập nhật." };
        }
        const { error } = await supabase
            .from(request.target_table)
            .update(request.new_data)
            .eq("id", request.target_record_id);
        applyError = error;
    } else if (request.action === "delete") {
        if (!request.target_record_id) {
            return { error: "Thiếu ID bản ghi cần xoá." };
        }
        const { error } = await supabase
            .from(request.target_table)
            .delete()
            .eq("id", request.target_record_id);
        applyError = error;
    } else {
        return { error: "Hành động (Action) không hợp lệ." };
    }

    if (applyError) {
        console.error("Error applying change:", applyError);
        return { error: "Xảy ra lỗi khi áp dụng dữ liệu vào hệ thống chính." };
    }

    // Storage cleanup logic on approval
    if (request.target_table === "persons") {
        if (request.action === "update" && oldAvatarUrl && oldAvatarUrl !== newAvatarUrl) {
            try {
                const fName = oldAvatarUrl.split("/").pop();
                if (fName) await supabase.storage.from("avatars").remove([fName]);
            } catch (e) {
                console.error("Failed to delete replaced avatar:", e);
            }
        } else if (request.action === "delete" && oldAvatarUrl) {
            try {
                const fName = oldAvatarUrl.split("/").pop();
                if (fName) await supabase.storage.from("avatars").remove([fName]);
            } catch (e) {
                console.error("Failed to delete avatar string member delete:", e);
            }
        }
    }

    // Special handling for posts: ensure status is 'published' on approval
    if (request.target_table === 'posts' && (request.action === 'insert' || request.action === 'update')) {
        await supabase
            .from('posts')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', request.target_record_id || request.new_data.id);
    }

    // 4. Update request status to 'approved'
    await supabase
        .from("change_requests")
        .update({
            status: "approved",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    // 5. Revalidation
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/posts");

    return { success: true };
}

export async function rejectChangeRequest(requestId: string, note?: string) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verify admin
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Vui lòng đăng nhập." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { error: "Từ chối truy cập. Chỉ Admin mới có quyền." };
    }

    const { data: request, error: reqError } = await supabase
        .from("change_requests")
        .select("*")
        .eq("id", requestId)
        .single();
    
    if (reqError || !request) {
        return { error: "Không tìm thấy yêu cầu." };
    }

    // Check if there is an avatar uploaded that needs to be deleted since it's rejected
    if (request.target_table === "persons" && request.new_data?.avatar_url) {
        const newAvatarUrl = request.new_data.avatar_url;
        const oldAvatarUrl = request.old_data?.avatar_url;
        if (newAvatarUrl !== oldAvatarUrl) {
            try {
                const fName = newAvatarUrl.split("/").pop();
                if (fName) await supabase.storage.from("avatars").remove([fName]);
            } catch (e) {
                console.error("Failed to delete rejected avatar upload", e);
            }
        }
    }

    // Reject the request
    const { error } = await supabase
        .from("change_requests")
        .update({
            status: "rejected",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            reviewer_note: note || null,
        })
        .eq("id", requestId);

    if (error) {
        console.error("Error rejecting change:", error);
        return { error: "Xảy ra lỗi khi từ chối yêu cầu." };
    }

    revalidatePath("/dashboard/approvals");
    return { success: true };
}
