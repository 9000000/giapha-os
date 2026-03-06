-- ==========================================
-- GIAPHA-OS DATABASE UPDATE
-- TÍNH NĂNG: Phân cấp Admin (Admin mới không được xoá/sửa Admin cũ)
-- ==========================================
-- Hướng dẫn: Mở SQL Editor trên Supabase, dán toàn bộ đoạn code này vào và chạy (Run).

-- 1. Cập nhật hàm Xoá (delete_user)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    -- Lấy thông tin người thao tác (caller)
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;
    
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Cannot delete yourself. Bạn không thể tự xoá chính mình.';
    END IF;

    -- Lấy thông tin người bị thao tác (target)
    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    -- Kiểm tra luật thâm niên: Nếu target CŨNG LÀ ADMIN, nhưng sinh ra TRƯỚC (hoặc cùng lúc) caller, thì cấm xoá.
    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền xoá người quản trị được tạo trước bạn.';
    END IF;

    -- Xoá User
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 2. Cập nhật hàm Đổi Vai trò (set_user_role)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;

    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    -- Kiểm tra luật thâm niên: Chặn không cho đổi quyền của Admin "tiền bối"
    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền thay đổi vai trò của người quản trị được tạo trước bạn.';
    END IF;

    -- Thực hiện update
    UPDATE public.profiles
    SET role = new_role::public.user_role_enum
    WHERE id = target_user_id;
END;
$$;

-- 3. Cập nhật hàm Đổi Trạng thái Khoá/Duyệt (set_user_active_status)
CREATE OR REPLACE FUNCTION public.set_user_active_status(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;

    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    -- Kiểm tra luật thâm niên: Tương tự, cấm khoá/mở khoá Admin sinh trước caller.
    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền thay đổi trạng thái của người quản trị được tạo trước bạn.';
    END IF;

    UPDATE public.profiles
    SET is_active = new_status
    WHERE id = target_user_id;
    
    -- Tự động confirm email nếu người quản trị nhấn Duyệt và chưa confirm
    IF new_status = true THEN
        UPDATE auth.users 
        SET email_confirmed_at = NOW() 
        WHERE id = target_user_id AND email_confirmed_at IS NULL;
    END IF;
END;
$$;
