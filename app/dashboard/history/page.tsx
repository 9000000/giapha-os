import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HistoryClient from "./HistoryClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Lịch sử đề xuất - Gia Phả",
};

export default async function HistoryPage() {
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

    if (!profile) {
        redirect("/dashboard");
    }

    // Lấy danh sách các yêu cầu
    let query = supabase
        .from("change_requests")
        .select(`
      *,
      requester:profiles!requested_by(id, role)
    `)
        .order("created_at", { ascending: false });

    if (profile.role !== "admin") {
        query = query.eq("requested_by", user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
        console.error("Error fetching history change requests:", error);
    }

    // Lấy thông tin admin nếu cần map email
    const { data: adminUsers } = await supabase.rpc("get_admin_users");

    // Chỉ áp dụng map email nếu có quyền gọi rpc get_admin_users (thường chỉ admin mới gọi được)
    // Đối với Editor chỉ xem của chính họ nên để mặc định theo log auth
    const enrichedRequests = requests?.map((req) => {
        if (profile.role === 'admin' && adminUsers) {
            const userDetail = adminUsers.find((u: any) => u.id === req.requested_by);
            return {
                ...req,
                requester: {
                    ...(req.requester || {}),
                    email: userDetail?.email || "Unknown",
                    full_name: userDetail?.email?.split('@')[0] || "Unknown"
                },
            };
        }

        return {
            ...req,
            requester: {
                ...(req.requester || {}),
                email: user.email,
                full_name: user.email?.split('@')[0]
            },
        };
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="mb-8">
                <h2 className="text-2xl font-serif font-bold text-stone-800">
                    Lịch sử đề xuất
                </h2>
                <p className="text-stone-500 mt-1">
                    Danh sách các thay đổi bạn đã yêu cầu và trạng thái xử lý.
                </p>
            </div>

            <HistoryClient initialRequests={enrichedRequests || []} />
        </div>
    );
}
