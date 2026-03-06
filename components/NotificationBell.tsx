"use client";

import { useUser } from "@/components/UserProvider";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, UserPlus, FileEdit, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";

interface NotificationItem {
    id: string; // id của person hoặc change_request
    type: "new_member" | "change_request" | "new_user";
    title: string;
    message: string;
    created_at: string;
    link: string;
    isRead: boolean;
}

export default function NotificationBell() {
    const { user, isAdmin } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const menuRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    // 1. Load Last Read Timestamp from LocalStorage
    useEffect(() => {
        if (typeof window !== "undefined" && user?.id) {
            const stored = localStorage.getItem(`giapha_last_read_notifications_${user.id}`);
            if (stored) {
                setLastReadTimestamp(parseInt(stored, 10));
            } else {
                // If first time, set to a week ago so they don't get overwhelmed
                setLastReadTimestamp(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }
        }
    }, [user?.id]);

    // 2. Fetch Notifications (Merge 2 sources)
    const fetchNotifications = async () => {
        if (!user) return;

        let items: NotificationItem[] = [];

        // Lấy 10 thành viên mới được thêm vào (Ai cũng xem được)
        const { data: recentPersons } = await supabase
            .from("persons")
            .select("id, full_name, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        if (recentPersons) {
            const personItems = recentPersons.map((p) => ({
                id: p.id,
                type: "new_member" as const,
                title: "Thành viên mới",
                message: `Đã thêm ${p.full_name} vào gia phả.`,
                created_at: p.created_at,
                link: `/dashboard/members/${p.id}`,
                isRead: false,
            }));
            items = [...items, ...personItems];
        }

        // Nếu là Admin, lấy thêm yêu cầu cần duyệt (Pending)
        if (isAdmin) {
            const { data: pendingRequests } = await supabase
                .from("change_requests")
                .select("id, target_table, created_at")
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(10);

            if (pendingRequests) {
                const reqItems = pendingRequests.map((r) => ({
                    id: r.id,
                    type: "change_request" as const,
                    title: "Yêu cầu cần duyệt",
                    message: `Một yêu cầu thay đổi dữ liệu bảng (${r.target_table}) cần bạn phê duyệt.`,
                    created_at: r.created_at,
                    link: `/dashboard/approvals`,
                    isRead: false,
                }));
                items = [...items, ...reqItems];
            }

            // Lấy thêm 10 tài khoản mới đăng ký
            const { data: allUsers } = await supabase.rpc("get_admin_users");
            if (allUsers) {
                const sortedUsers = [...allUsers]
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10);

                const userItems = sortedUsers.map((u: any) => ({
                    id: u.id,
                    type: "new_user" as const,
                    title: "Tài khoản đăng ký mới",
                    message: `Một tài khoản ${u.role === 'admin' ? 'Quản trị' : u.role === 'editor' ? 'Ban biên tập' : 'Thuộc dòng họ'} (${u.email?.replace('@giapha.local', '')}) ${u.is_active ? 'vừa được tạo' : 'đang chờ duyệt'}.`,
                    created_at: u.created_at,
                    link: `/dashboard/users`,
                    isRead: false,
                }));
                items = [...items, ...userItems];
            }
        }

        // Sắp xếp giảm dần theo thời gian tạo
        items.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Rút gọn chỉ lấy 10 thông báo mới nhất tổng hợp để giao diện gọn gàng
        items = items.slice(0, 10);

        // Tính isRead
        items = items.map(item => {
            const itemTime = new Date(item.created_at).getTime();
            return {
                ...item,
                isRead: itemTime <= lastReadTimestamp
            };
        });

        setNotifications(items);
        setUnreadCount(items.filter((i) => !i.isRead).length);
    };

    // 3. Realtime Subscription (Watch for new persons and change_requests)
    useEffect(() => {
        fetchNotifications();

        const personsChannel = supabase
            .channel("persons-notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "persons" },
                (_payload) => {
                    fetchNotifications();
                    router.refresh(); // Tự động làm mới UI trang 
                }
            )
            .subscribe();

        let requestsChannel: any = null;
        let profilesChannel: any = null;
        if (isAdmin) {
            requestsChannel = supabase
                .channel("requests-notifications")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "change_requests" },
                    (_payload) => {
                        fetchNotifications();
                        router.refresh();
                    }
                )
                .subscribe();

            profilesChannel = supabase
                .channel("profiles-notifications")
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "profiles" },
                    (_payload) => {
                        fetchNotifications();
                        router.refresh();
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(personsChannel);
            if (requestsChannel) {
                supabase.removeChannel(requestsChannel);
            }
            if (profilesChannel) {
                supabase.removeChannel(profilesChannel);
            }
        };
    }, [user?.id, isAdmin, lastReadTimestamp]); // Re-fetch when lastRead changes to update styles

    // 4. Handle Outside Click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 5. Mở danh sách và đánh dấu đã đọc
    const handleToggleMenu = () => {
        const opening = !isOpen;
        setIsOpen(opening);
        if (opening && user?.id) {
            const now = Date.now();
            setLastReadTimestamp(now);
            localStorage.setItem(`giapha_last_read_notifications_${user.id}`, now.toString());
            setUnreadCount(0); // Clear chấm đỏ ngay lập tức

            // Đánh dấu tất cả là đã đọc
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={handleToggleMenu}
                className="relative flex items-center justify-center p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
                <Bell className="size-5 text-stone-600" />

                {/* Unread dot */}
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full border-2 border-white pointer-events-none" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-stone-800">Thông báo</h3>
                            <span className="text-xs text-stone-400 font-medium bg-white px-2 py-0.5 rounded-full border border-stone-200">
                                10 Mới nhất
                            </span>
                        </div>

                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-stone-500">
                                    <Bell className="size-8 mx-auto mb-2 text-stone-300" />
                                    <p className="text-sm">Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((notif) => (
                                        <Link
                                            key={notif.id}
                                            href={notif.link}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex gap-3 px-4 py-3 hover:bg-stone-50 border-b border-stone-100/50 transition-colors last:border-0 ${!notif.isRead ? "bg-amber-50/40" : ""
                                                }`}
                                        >
                                            <div className={`mt-0.5 shrink-0 flex items-center justify-center size-8 rounded-full ${notif.type === 'new_member' ? 'bg-sky-100 text-sky-600' :
                                                notif.type === 'new_user' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                {notif.type === 'new_member' ? <UserPlus className="size-4" /> :
                                                    notif.type === 'new_user' ? <Clock className="size-4" /> :
                                                        <FileEdit className="size-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                                    <p className={`text-sm truncate ${!notif.isRead ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[10px] text-stone-400 flex items-center gap-1 shrink-0">
                                                        {new Date(notif.created_at).toLocaleDateString("vi-VN")}
                                                    </span>
                                                </div>
                                                <p className={`text-xs ${!notif.isRead ? 'text-stone-700 font-medium' : 'text-stone-500'} line-clamp-2`}>
                                                    {notif.message}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
