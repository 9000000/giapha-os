import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import ApprovalsClient from "./ApprovalsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Phê duyệt thay đổi - Gia Phả",
};

export default async function ApprovalsPage() {
    const [user, profile] = await Promise.all([getUser(), getProfile()]);

    if (!user) {
        redirect("/login");
    }

    if (profile?.role !== "admin") {
        redirect("/dashboard");
    }

    const supabase = await getSupabase();

    // Lấy danh sách các yêu cầu đang chờ phê duyệt và danh sách users song song
    const [{ data: requests, error }, { data: adminUsers }] = await Promise.all([
        supabase
            .from("change_requests")
            .select(`
      *,
      requester:profiles!requested_by(id, role)
    `)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
        supabase.rpc("get_admin_users"),
    ]);

    if (error) {
        console.error("Error fetching change requests:", error);
    }

    // Ghép email vào cho từng request
    const enrichedRequests = requests?.map((req) => {
        const userDetail = adminUsers?.find((u: any) => u.id === req.requested_by);
        return {
            ...req,
            requester: {
                ...(req.requester || {}),
                email: userDetail?.email || "Unknown",
                full_name: userDetail?.email?.split('@')[0] || "Unknown"
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
