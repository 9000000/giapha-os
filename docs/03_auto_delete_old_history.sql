-- Kích hoạt extension pg_cron (Yêu cầu bật extension này trong mục Database -> Extensions của Supabase trước tiên)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Lên lịch xóa các yêu cầu đã phê duyệt/từ chối cũ hơn 30 ngày (Job chay lúc 00:00 hằng ngày)
SELECT cron.schedule(
    'delete-old-change-requests',
    '0 0 * * *',
    $$
        DELETE FROM public.change_requests
        WHERE created_at < NOW() - INTERVAL '30 days'
          AND status IN ('approved', 'rejected');
    $$
);
