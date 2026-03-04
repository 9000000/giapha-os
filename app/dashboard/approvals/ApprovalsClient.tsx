"use client";

import { approveChangeRequest, rejectChangeRequest } from "@/app/actions/approvals";
import { useState } from "react";
import { Check, X, Clock, AlertCircle } from "lucide-react";

export default function ApprovalsClient({ initialRequests }: { initialRequests: any[] }) {
    const [requests, setRequests] = useState(initialRequests);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        if (!confirm("Chấp nhận thay đổi này? Hành động này sẽ cập nhật vào CSDL lưu trữ chính thức.")) return;
        setProcessingId(id);
        try {
            const res = await approveChangeRequest(id);
            if (res.error) throw new Error(res.error);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            alert("Đã phê duyệt thành công.");
        } catch (err: any) {
            alert("Lỗi: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu này không?")) return;
        setProcessingId(id);
        try {
            const res = await rejectChangeRequest(id, "Bị từ chối bởi Quản trị viên");
            if (res.error) throw new Error(res.error);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            alert("Đã từ chối yêu cầu.");
        } catch (err: any) {
            alert("Lỗi: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const formatAction = (type: string, table: string) => {
        const tableNames: Record<string, string> = {
            persons: "Thành viên",
            relationships: "Quan hệ gia đình",
        };
        const actionNames: Record<string, string> = {
            insert: "Thêm mới",
            update: "Cập nhật",
            delete: "Xóa",
        };
        return `${actionNames[type] || type} ${tableNames[table] || table}`.trim();
    };

    const fieldLabels: Record<string, string> = {
        full_name: "Họ và tên",
        gender: "Giới tính",
        birth_year: "Năm sinh",
        birth_month: "Tháng sinh",
        birth_day: "Ngày sinh",
        death_year: "Năm mất",
        death_month: "Tháng mất",
        death_day: "Ngày mất",
        is_deceased: "Đã qua đời",
        is_in_law: "Là dâu/rể",
        birth_order: "Thứ tự sinh",
        generation: "Đời thứ",
        other_names: "Tên gọi khác",
        note: "Ghi chú",
        type: "Loại quan hệ"
    };

    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === "") return <span className="text-stone-400 italic">Trống</span>;
        if (typeof value === "boolean") return value ? "Có" : "Không";
        if (key === "gender") return value === "male" ? "Nam" : value === "female" ? "Nữ" : "Khác";
        if (key === "type") return value === "marriage" ? "Hôn nhân (Vợ/Chồng)" : value === "biological_child" ? "Con cái" : value === "adopted_child" ? "Con nuôi" : value;
        return String(value);
    };

    const renderDataView = (data: any, title: string, colorClass: string, textClass: string) => {
        if (!data) return null;

        const skipFields = ['id', 'created_at', 'updated_at', 'person_a', 'person_b'];
        const entries = Object.entries(data).filter(([k]) => !skipFields.includes(k));

        return (
            <div>
                <h4 className="text-stone-500 font-sans font-semibold mb-3">{title}:</h4>
                <div className={`rounded-xl border p-4 sm:p-5 space-y-3 ${colorClass}`}>
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-black/5 last:border-0 pb-3 last:pb-0">
                            <span className="text-sm font-medium text-stone-500 min-w-[140px]">
                                {fieldLabels[key] || key}:
                            </span>
                            <span className={`text-sm font-medium ${textClass}`}>
                                {formatValue(key, value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-400">
                    <Check className="size-8" />
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-1">Không có yêu cầu chờ duyệt</h3>
                <p className="text-stone-500 text-sm">Tất cả các thay đổi từ Editor đã được xử lý.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 border-b border-stone-100 pb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
                  ${req.action === 'insert' ? 'bg-sky-100 text-sky-700' :
                                        req.action === 'update' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'}`}>
                                    {formatAction(req.action, req.target_table)}
                                </span>
                                <span className="text-xs text-stone-500 flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {new Date(req.created_at).toLocaleString('vi-VN')}
                                </span>
                            </div>
                            <p className="text-sm text-stone-600">
                                Người gửi: <span className="font-medium text-stone-900">{req.requester?.full_name || req.requester?.email || "Unknown"}</span>
                            </p>
                            {req.target_table === 'persons' && req.new_data?.full_name && (
                                <p className="text-sm text-stone-600 mt-1">
                                    Tên mục tiêu: <span className="font-medium text-stone-900">{req.new_data.full_name}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleReject(req.id)}
                                disabled={processingId !== null}
                                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                                <X className="size-4" /> Từ chối
                            </button>
                            <button
                                onClick={() => handleApprove(req.id)}
                                disabled={processingId !== null}
                                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                                <Check className="size-4" /> Phê duyệt
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl overflow-hidden mt-6 border-t border-stone-100 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            {renderDataView(req.old_data, "Dữ liệu cũ trước khi đổi", "bg-rose-50/30 border-rose-100/60", "text-rose-900")}
                            {renderDataView(req.new_data, req.action === 'insert' ? "Dữ liệu tạo mới" : "Dữ liệu mới yêu cầu cập nhật", "bg-emerald-50/30 border-emerald-100/60", "text-emerald-900")}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
