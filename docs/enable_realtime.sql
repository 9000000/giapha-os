-- ==========================================
-- GIAPHA-OS DATABASE UPDATE
-- TÍNH NĂNG: BẬT TỰ ĐỘNG PHÁT THÔNG BÁO (REALTIME)
-- ==========================================
-- Hướng dẫn: Mở SQL Editor trên Supabase, dán toàn bộ đoạn code này vào và chạy (Run).

-- 1. Bật tính năng Realtime (Cập nhật thời gian thực) cho các bảng
-- Điều này cho phép ứng dụng nhận tín hiệu khi có người Cập nhật / Thêm mới
ALTER PUBLICATION supabase_realtime ADD TABLE public.persons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 2. Cấp quyền Replica Identity để gửi kèm dữ liệu cũ khi Update/Delete (Nâng cao)
ALTER TABLE public.persons REPLICA IDENTITY FULL;
ALTER TABLE public.change_requests REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
