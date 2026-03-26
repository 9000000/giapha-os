"use client";

import { useState } from "react";
import { Check, X, Clock, AlertCircle } from "lucide-react";

export default function HistoryClient({ initialRequests }: { initialRequests: any[] }) {
    const [requests] = useState(initialRequests);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [showCount, setShowCount] = useState(20);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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
                <h4 className="text-stone-500 font-sans font-semibold mb-2 text-xs uppercase tracking-wider">{title}</h4>
                <div className={`rounded-lg border p-3 space-y-1.5 ${colorClass}`}>
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex justify-between items-baseline gap-2 pb-1 border-b border-black/5 last:border-0 last:pb-0">
                            <span className="text-xs font-medium text-stone-500 shrink-0">
                                {fieldLabels[key] || key}:
                            </span>
                            <span className={`text-xs font-semibold text-right ${textClass}`}>
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
            <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3 text-stone-400">
                    <Clock className="size-6" />
                </div>
                <h3 className="text-base font-medium text-stone-900 mb-1">Không có lịch sử đề xuất nào</h3>
                <p className="text-stone-500 text-sm">Bạn chưa từng gửi yêu cầu thay đổi nào, hoặc tất cả đề xuất đã bị xóa do các điều chỉnh đồng nhất của Admin.</p>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-4">
            {requests.slice(0, showCount).map((req) => {
                const isExpanded = expandedIds.has(req.id);
                return (
                    <div key={req.id} className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm transition-all hover:shadow-md">
                        <div className={`flex flex-col sm:flex-row justify-between gap-3 ${isExpanded ? 'mb-3 border-b border-stone-100 pb-3' : ''}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wider
                  ${req.action === 'insert' ? 'bg-sky-100 text-sky-700' :
                                            req.action === 'update' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'}`}>
                                        {formatAction(req.action, req.target_table)}
                                    </span>
                                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                                        <Clock className="size-3" />
                                        {new Date(req.created_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <p className="text-stone-600">
                                        <span className="font-medium text-stone-900">{req.requester?.full_name || req.requester?.email || "Unknown"}</span>
                                    </p>
                                    {req.target_table === 'persons' && req.new_data?.full_name && (
                                        <>
                                            <span className="text-stone-300">•</span>
                                            <p className="text-stone-600">
                                                Mục tiêu: <span className="font-medium text-stone-900">{req.new_data.full_name}</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 h-fit mt-1 sm:mt-0">
                                {req.status === 'pending' && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/50 rounded-md">
                                        <Clock className="size-3" /> Đang chờ duyệt
                                    </span>
                                )}
                                {req.status === 'approved' && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/50 rounded-md">
                                        <Check className="size-3" /> Đã được duyệt
                                    </span>
                                )}
                                {req.status === 'rejected' && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/50 rounded-md">
                                        <X className="size-3" /> Đã bị từ chối
                                    </span>
                                )}
                                <button
                                    onClick={() => toggleExpand(req.id)}
                                    className="text-xs font-medium text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-200"
                                >
                                    {isExpanded ? "Thu gọn" : "Chi tiết"}
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-white rounded-lg overflow-hidden border-t border-stone-50 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {renderDataView(req.old_data, "Dữ liệu ban đầu", "bg-rose-50/30 border-rose-100/60", "text-rose-900")}
                                    {renderDataView(req.new_data, req.action === 'insert' ? "Tạo mới" : "Cập nhật thành", "bg-emerald-50/30 border-emerald-100/60", "text-emerald-900")}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>

            {requests.length > showCount && (
                <button
                    onClick={() => setShowCount((n) => n + 20)}
                    className="w-full py-3 text-sm font-semibold text-stone-500 hover:text-amber-600 transition-colors"
                >
                    Xem thêm {requests.length - showCount} lịch sử…
                </button>
            )}
        </>
    );
}
