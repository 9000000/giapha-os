# [Tạo ứng dụng Android cho Gia Phả OS]

Dự án hiện tại là web sử dụng Next.js. Vì ứng dụng có sử dụng Server-Side Rendering (SSR) khá nhiều (như `cookies()`, xác thực Supabase lấy Role, Dynamic Routes...), việc đóng gói thành Static HTML sẽ bị lỗi.

Giải pháp tốt nhất là sử dụng **Capacitor** nhưng cấu hình dưới dạng **WebView trỏ thẳng URL gốc**. Cách này có 2 ưu điểm cực lớn:
1. Ứng dụng Android siêu nhẹ (Chỉ vài MB).
2. Khi ban cập nhật Code Web trên Vercel, ứng dụng điện thoại sẽ TỰ ĐỘNG nhận giao diện/chức năng mới mà không cần người dùng lên Store tải bản cập nhật lại.

## Quá trình cài đặt (Gia Phả AI đã chạy giúp bạn)

1. Cài đặt các gói: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`
2. Cấu hình file `capacitor.config.ts`: Trỏ thẳng server load về `https://giapha-os.vercel.app`
3. Khởi tạo folder Android bằng `npx cap add android`

## Cách bạn chạy thử và xuất App (.APK)

Bạn không cần build code web nữa! Để mở ứng dụng lên trong môi trường giả lập hoặc cắm máy thật, bạn mở **Terminal** tại gốc dự án và gõ đoạn sau:

```bash
npx cap open android
```

Lệnh này sẽ tự động gọi **Android Studio** mở thư mục `android` của dự án lên. 

- Đợi 1 chút cho Gradle sync (Góc dưới bên phải Android Studio chạy thanh load màu xanh).
- Bấm nút **Play (▶️)** màu xanh trên thanh công cụ để mở và cài lên Điện thoại của bạn hoặc trên Emulator.
- Để xuất file .APK: Trong Android Studio chọn menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## Yêu cầu Hệ thống phải có:
  - Máy tính đã cài **Android Studio**
  - Mở Android Studio và cài đặt **SDK Command-line Tools**.
