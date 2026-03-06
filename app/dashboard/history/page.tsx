import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import HistoryClient from "./HistoryClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Lịch sử đề xuất - Gia Phả",
};

export default async function HistoryPage() {
    const [user, profile] = await Promise.all([getUser(), getProfile()]);

    if (!user) {
        redirect("/login");
    }

    if (!profile) {
        redirect("/dashboard");
    }

    const supabase = await getSupabase();

    // Lấy danh sách các yêu cầu và admin users song song
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

    const [{ data: requests, error }, { data: adminUsers }] = await Promise.all([
        query,
        supabase.rpc("get_admin_users"),
    ]);

    if (error) {
        console.error("Error fetching history change requests:", error);
    }

    // Ghép email vào cho từng request
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
