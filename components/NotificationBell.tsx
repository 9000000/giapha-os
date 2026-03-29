"use client";

import { useUser } from "@/components/UserProvider";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, UserPlus, FileEdit, Clock, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationItem {
    id: string; // id of person or change_request
    type: "new_member" | "change_request" | "new_user";
    title: string;
    message: string;
    created_at: string;
    link: string;
    isRead: boolean;
}

// Helper to build a unique key for each notification
function notifKey(item: { type: string; id: string }) {
    return `${item.type}::${item.id}`;
}

export default function NotificationBell() {
    const { user, isAdmin } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Store read notification keys with their read_at timestamps
    const readKeysRef = useRef<Map<string, string>>(new Map());
    const readKeysLoadedRef = useRef(false);

    // 24 hours in milliseconds
    const HIDE_AFTER_MS = 24 * 60 * 60 * 1000;

    const menuRef = useRef<HTMLDivElement>(null);
    const { supabase } = useUser();
    const router = useRouter();

    // 1. Load read keys from Supabase on mount
    const loadReadKeys = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data } = await supabase
                .from("notification_reads")
                .select("notification_key, read_at")
                .eq("user_id", user.id);

            if (data) {
                const map = new Map<string, string>();
                data.forEach((r: any) => map.set(r.notification_key, r.read_at));
                readKeysRef.current = map;
            }
        } catch {
            // Fallback: empty map if table doesn't exist yet
            readKeysRef.current = new Map();
        }
        readKeysLoadedRef.current = true;
    }, [user?.id, supabase]);

    // 2. Fetch Notifications (Merge sources) — all queries run in parallel
    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        // Ensure read keys are loaded first
        if (!readKeysLoadedRef.current) {
            await loadReadKeys();
        }

        let items: NotificationItem[] = [];

        // Build queries array for parallel execution
        const personsQuery = supabase
            .from("persons")
            .select("id, full_name, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        // Admin-only queries
        const requestsQuery = isAdmin
            ? supabase
                .from("change_requests")
                .select("id, target_table, created_at")
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(10)
            : null;

        const usersQuery = isAdmin
            ? supabase.rpc("get_admin_users")
            : null;

        // Execute ALL queries in parallel
        const [personsResult, requestsResult, usersResult] = await Promise.all([
            personsQuery,
            requestsQuery,
            usersQuery,
        ]);

        // Process persons results
        const recentPersons = personsResult.data;
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

        // Process admin results
        if (isAdmin) {
            const pendingRequests = requestsResult?.data;
            if (pendingRequests) {
                const reqItems = pendingRequests.map((r: any) => ({
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

            const allUsers = usersResult?.data;
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

        // Sort by created_at descending
        items.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Keep only top 10 newest
        items = items.slice(0, 10);

        // Determine isRead by checking if this notification's key is in our read map
        items = items.map(item => ({
            ...item,
            isRead: readKeysRef.current.has(notifKey(item)),
        }));

        // Filter out notifications that have been read for more than 24 hours
        const now = Date.now();
        items = items.filter(item => {
            if (!item.isRead) return true; // Always show unread
            const readAt = readKeysRef.current.get(notifKey(item));
            if (!readAt) return true; // No read_at timestamp, keep it
            const readTime = new Date(readAt).getTime();
            return (now - readTime) < HIDE_AFTER_MS;
        });

        setNotifications(items);
        setUnreadCount(items.filter((i) => !i.isRead).length);
    }, [user, isAdmin, supabase, loadReadKeys]);

    // Keep a ref to the latest fetchNotifications to avoid stale closures in subscriptions
    const fetchRef = useRef(fetchNotifications);
    useEffect(() => { fetchRef.current = fetchNotifications; }, [fetchNotifications]);

    // 3. Realtime Subscription + Polling fallback
    useEffect(() => {
        fetchRef.current();

        // Polling fallback every 30s in case realtime connection drops
        const pollInterval = setInterval(() => { fetchRef.current(); }, 30_000);

        const personsChannel = supabase
            .channel("persons-notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "persons" },
                () => {
                    fetchRef.current();
                    router.refresh();
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
                    () => {
                        fetchRef.current();
                        router.refresh();
                    }
                )
                .subscribe();

            profilesChannel = supabase
                .channel("profiles-notifications")
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "profiles" },
                    () => {
                        fetchRef.current();
                        router.refresh();
                    }
                )
                .subscribe();
        }

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(personsChannel);
            if (requestsChannel) {
                supabase.removeChannel(requestsChannel);
            }
            if (profilesChannel) {
                supabase.removeChannel(profilesChannel);
            }
        };
    }, [user?.id, isAdmin, supabase, router]);

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

    // 5. Toggle menu — just open/close, do NOT mark all as read
    const handleToggleMenu = () => {
        setIsOpen(prev => !prev);
    };

    // 6. Mark a single notification as read when clicked (persist to Supabase)
    const handleNotificationClick = async (notif: NotificationItem) => {
        const key = notifKey(notif);
        if (!readKeysRef.current.has(key) && user?.id) {
            const nowISO = new Date().toISOString();
            readKeysRef.current.set(key, nowISO);

            // Persist to database (upsert to avoid duplicates)
            supabase
                .from("notification_reads")
                .upsert(
                    { user_id: user.id, notification_key: key, read_at: nowISO },
                    { onConflict: "user_id,notification_key" }
                )
                .then(); // fire-and-forget, no need to await

            // Update UI: mark this one as read
            setNotifications((prev: NotificationItem[]) =>
                prev.map((n: NotificationItem) =>
                    notifKey(n) === key ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setIsOpen(false);
    };

    // 7. Mark ALL as read (persist to Supabase)
    const handleMarkAllRead = async () => {
        if (!user?.id) return;

        const unreadNotifs = notifications.filter(n => !n.isRead);
        const newKeys = unreadNotifs.map(n => notifKey(n));
        const nowISO = new Date().toISOString();

        // Add to local map with current timestamp
        newKeys.forEach(key => readKeysRef.current.set(key, nowISO));

        // Batch insert to database
        if (newKeys.length > 0) {
            const rows = newKeys.map(key => ({
                user_id: user.id,
                notification_key: key,
                read_at: nowISO,
            }));

            supabase
                .from("notification_reads")
                .upsert(rows, { onConflict: "user_id,notification_key" })
                .then(); // fire-and-forget
        }

        setNotifications((prev: NotificationItem[]) => prev.map((n: NotificationItem) => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={handleToggleMenu}
                className="relative flex items-center justify-center p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
                <Bell className="size-5 text-stone-600" />

                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white pointer-events-none shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
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
                            {unreadCount > 0 ? (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-amber-50 transition-colors"
                                >
                                    <CheckCheck className="size-3" />
                                    Đọc tất cả
                                </button>
                            ) : (
                                <span className="text-xs text-stone-400 font-medium bg-white px-2 py-0.5 rounded-full border border-stone-200">
                                    Đã đọc hết
                                </span>
                            )}
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
                                            key={notifKey(notif)}
                                            href={notif.link}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`flex gap-3 px-4 py-3 border-b border-stone-100/50 transition-colors last:border-0 ${!notif.isRead
                                                ? "bg-amber-50/60 hover:bg-amber-100/50"
                                                : "hover:bg-stone-50"
                                                }`}
                                        >
                                            {/* Unread dot indicator */}
                                            {!notif.isRead && (
                                                <div className="absolute left-1.5 mt-3">
                                                    <span className="block size-2 rounded-full bg-amber-500 shadow-sm" />
                                                </div>
                                            )}
                                            <div className={`mt-0.5 shrink-0 flex items-center justify-center size-8 rounded-full ${notif.type === 'new_member' ? 'bg-sky-100 text-sky-600' :
                                                notif.type === 'new_user' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                {notif.type === 'new_member' ? <UserPlus className="size-4" /> :
                                                    notif.type === 'new_user' ? <Clock className="size-4" /> :
                                                        <FileEdit className="size-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                                    <p className={`text-sm truncate ${!notif.isRead ? 'font-bold text-stone-900' : 'font-medium text-stone-600'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[10px] text-stone-400 flex items-center gap-1 shrink-0">
                                                        {new Date(notif.created_at).toLocaleDateString("vi-VN")}
                                                    </span>
                                                </div>
                                                <p className={`text-xs line-clamp-2 ${!notif.isRead ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
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
