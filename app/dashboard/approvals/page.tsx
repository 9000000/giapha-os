import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ApprovalsClient from "./ApprovalsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Phê duyệt thay đổi - Gia Phả",
};

export default async function ApprovalsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        redirect("/dashboard");
    }

    // Lấy danh sách các yêu cầu đang chờ phê duyệt
    const { data: requests, error } = await supabase
        .from("change_requests")
        .select(`
      *,
      requester:profiles!requested_by(id, role)
    `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching change requests:", error);
    }

    // Lấy danh sách users (chi tiết có email từ auth.users) bằng RPC cho Admin
    const { data: adminUsers } = await supabase.rpc("get_admin_users");

    // Ghép email vào cho từng request
    const enrichedRequests = requests?.map((req) => {
        const userDetail = adminUsers?.find((u: any) => u.id === req.requested_by);
        return {
            ...req,
            requester: {
                ...(req.requester || {}),
                email: userDetail?.email || "Unknown",
                full_name: userDetail?.email?.split('@')[0] || "Unknown" // Không có full_name nên lấy log id
            },
        };
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="mb-8">
                <h2 className="text-2xl font-serif font-bold text-stone-800">
                    Phê duyệt thay đổi
                </h2>
                <p className="text-stone-500 mt-1">
                    Quản lý các yêu cầu thêm mới, sửa đổi hoặc xóa dữ liệu từ Editor chờ bạn phê duyệt.
                </p>
            </div>

            <ApprovalsClient initialRequests={enrichedRequests || []} />
        </div>
    );
}
