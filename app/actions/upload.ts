"use server";

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Khởi tạo S3 Client cho Cloudflare R2
const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const UPLOAD_LIMIT_BYTES = 9.7 * 1024 * 1024 * 1024; // 9.7 GB - ngưỡng tắt upload

export async function getPresignedUploadUrl(
  fileName: string, 
  contentType: string, 
  folder: string = "general"
) {
  try {
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      throw new Error("Chưa cấu hình Cloudflare R2 trong biến môi trường.");
    }

    // Kiểm tra dung lượng trước khi cho phép upload
    const usage = await getStorageUsage();
    if (usage.success && usage.usedBytes !== undefined && usage.usedBytes >= UPLOAD_LIMIT_BYTES) {
      return {
        success: false,
        error: `Bộ nhớ đã đạt giới hạn (${((usage.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / 10 GB). Không thể tải thêm ảnh. Vui lòng xóa bớt ảnh cũ hoặc nâng cấp gói lưu trữ.`,
        storageFull: true,
      };
    }

    const uniqueId = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    // Tạo đường dẫn file an toàn (vd: posts/content_abc123_16800000.jpg)
    const filePath = `${folder}/${uniqueId}_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "")}`;

    // Tạo lệnh Yêu cầu Tải lên s3 (PutObject)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      ContentType: contentType,
    });

    // Tạo link upload tạm thời có hiệu lực trong 5 phút (300 giây)
    const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 300 });
    
    // Đường dẫn công khai sau khi upload xong
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filePath}`;

    return { success: true, presignedUrl, publicUrl, filePath };
  } catch (error: any) {
    console.error("Lỗi tạo Pre-signed URL:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteR2File(filePath: string) {
  try {
    if (!process.env.R2_BUCKET_NAME) return { success: false };
    
    // Nếu filePath truyền vào là link full public, phải cắt lấy phần đường dẫn bên trong
    let key = filePath;
    if (filePath.startsWith("http")) {
      const urlObj = new URL(filePath);
      // Xóa tên miền khỏi path (vd: /posts/image.jpg -> posts/image.jpg)
      key = urlObj.pathname.substring(1); 
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await S3.send(command);
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa file R2:", error);
    return { success: false, error: error.message };
  }
}

const MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB (R2 free tier)

export async function getStorageUsage() {
  try {
    if (!process.env.R2_BUCKET_NAME) {
      return { success: false, error: "Chưa cấu hình R2_BUCKET_NAME" };
    }

    let totalSize = 0;
    let totalFiles = 0;
    let continuationToken: string | undefined = undefined;

    // Paginate through all objects in the bucket
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const listResponse = await S3.send(listCommand) as {
        Contents?: { Size?: number }[];
        IsTruncated?: boolean;
        NextContinuationToken?: string;
      };

      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          totalSize += obj.Size || 0;
          totalFiles++;
        }
      }

      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);

    const usedMB = Math.round((totalSize / (1024 * 1024)) * 100) / 100;
    const maxMB = Math.round(MAX_STORAGE_BYTES / (1024 * 1024));
    const percentage = Math.min(
      Math.round((totalSize / MAX_STORAGE_BYTES) * 10000) / 100,
      100
    );

    return {
      success: true,
      usedBytes: totalSize,
      usedMB,
      maxMB,
      percentage,
      totalFiles,
    };
  } catch (error: any) {
    console.error("Lỗi lấy dung lượng R2:", error);
    return { success: false, error: error.message };
  }
}
