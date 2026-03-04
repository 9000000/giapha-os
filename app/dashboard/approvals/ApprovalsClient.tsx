"use client";

import { approveChangeRequest, rejectChangeRequest } from "@/app/actions/approvals";
import { useState } from "react";
import { Check, X, Clock, AlertCircle } from "lucide-react";

export default function ApprovalsClient({ initialRequests }: { initialRequests: any[] }) {
    const [requests, setRequests] = useState(initialRequests);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [rejectingId, setRejectingId] = useState<string | null>(null);

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
        if (!rejectNote.trim()) {
            alert("Vui lòng nhập lý do từ chối.");
            return;
        }
        setProcessingId(id);
        try {
            const res = await rejectChangeRequest(id, rejectNote);
            if (res.error) throw new Error(res.error);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            setRejectingId(null);
            setRejectNote("");
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
        return `${actionNames[type] || type} ${tableNames[table] || table}`;
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
                  ${req.action_type === 'insert' ? 'bg-sky-100 text-sky-700' :
                                        req.action_type === 'update' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'}`}>
                                    {formatAction(req.action_type, req.target_table)}
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
                            {rejectingId === req.id ? (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Lý do từ chối..."
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        className="flex-1 text-sm border-stone-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        disabled={processingId === req.id || !rejectNote.trim()}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-max"
                                    >
                                        Xác nhận
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRejectingId(null);
                                            setRejectNote("");
                                        }}
                                        disabled={processingId === req.id}
                                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-max"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setRejectingId(req.id)}
                                        disabled={processingId !== null}
                                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        <X className="size-4" /> Từ chối
                                    </button>
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={processingId !== null}
                                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                        <Check className="size-4" /> Phê duyệt
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-stone-50 rounded-xl p-4 text-xs font-mono overflow-auto max-h-60 border border-stone-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {req.old_data && (
                                <div>
                                    <h4 className="text-stone-500 font-sans font-semibold mb-2">Dữ liệu cũ:</h4>
                                    <pre className="text-rose-700 whitespace-pre-wrap bg-rose-50/50 p-3 rounded-md border border-rose-100">{JSON.stringify(req.old_data, null, 2)}</pre>
                                </div>
                            )}
                            {req.new_data && (
                                <div>
                                    <h4 className="text-stone-500 font-sans font-semibold mb-2">Dữ liệu mới:</h4>
                                    <pre className="text-emerald-700 whitespace-pre-wrap bg-emerald-50/50 p-3 rounded-md border border-emerald-100">{JSON.stringify(req.new_data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
