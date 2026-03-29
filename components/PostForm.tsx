"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { 
  FileText, 
  Image as ImageIcon, 
  Layout, 
  Type, 
  Link as LinkIcon, 
  Save, 
  X, 
  AlertCircle,
  Loader2,
  Globe,
  FileEdit,
  Upload,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { createPost, updatePost, Post } from "@/app/actions/posts";
import { createClient } from "@/utils/supabase/client";

interface PostFormProps {
  initialData?: Post;
  isEditing?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PostForm({ initialData, isEditing = false, onSuccess, onCancel }: PostFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image || "");
  const [status, setStatus] = useState(initialData?.status || "published");
  const [autoSlug, setAutoSlug] = useState(!initialData?.slug);
  
  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.featured_image || null);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && !isEditing) {
      const generatedSlug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/([^0-9a-z-\s])/g, "")
        .replace(/(\s+)/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }, [title, autoSlug, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFeaturedImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalImageUrl = featuredImage;

      // Handle Image Upload if a new file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `post_${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
        const filePath = `thumbnails/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, imageFile);

        if (uploadError) throw new Error("Lỗi khi tải ảnh lên: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const formData = {
        title,
        slug,
        content,
        excerpt,
        featured_image: finalImageUrl,
        status,
        published_at: status === 'published' ? (initialData?.published_at || new Date().toISOString()) : null,
      };

      if (isEditing && initialData) {
        const result = await updatePost(initialData.id, formData);
        if (result.error) throw new Error(result.error);
        if (result.pending) {
          alert("Thay đổi của bạn đã được gửi và đang chờ Admin phê duyệt.");
        }
      } else {
        const result = await createPost(formData);
        if (result.error) throw new Error(result.error);
        if (result.pending) {
          alert("Bài viết đã được tạo và đang chờ Admin phê duyệt trước khi công khai.");
        }
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard?view=posts");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu bài viết.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all";

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-stone-300/90 shadow-sm space-y-6"
          >
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <Type className="size-4 text-amber-600" />
                Tiêu đề bài viết
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tiêu đề hấp dẫn..."
                className={`${inputClasses} text-lg font-bold`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <Layout className="size-4 text-amber-600" />
                Tóm tắt nội dung (Hiển thị ở danh sách bài viết)
              </label>
              <textarea
                rows={3}
                required
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Nhập đoạn tóm tắt ngắn gọn để thu hút người đọc..."
                className={`${inputClasses} resize-none`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <FileEdit className="size-4 text-amber-600" />
                Nội dung chi tiết
              </label>
              <TipTapEditor
                value={content}
                onChange={setContent}
                className="min-h-[400px]"
              />
            </div>
          </motion.div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-stone-300/90 shadow-sm space-y-6 sticky top-24"
          >
            {/* Publish Settings */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                <Globe className="size-4 text-amber-600" />
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClasses}
              >
                <option value="published">Công khai (Published)</option>
                <option value="draft">Bản nháp (Draft)</option>
              </select>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                <ImageIcon className="size-4 text-amber-600" />
                Ảnh đại diện (Thumbnail)
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`group relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2
                  ${imagePreview ? 'border-amber-200 bg-amber-50/60' : 'border-stone-200 bg-stone-50 hover:border-amber-300 hover:bg-amber-50/50'}`}
              >
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold flex items-center gap-1">
                        <Upload className="size-4" /> Thay đổi ảnh
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-stone-100 group-hover:scale-110 transition-transform">
                      <Upload className="size-6 text-stone-400 group-hover:text-amber-600" />
                    </div>
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tải ảnh lên</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              {imagePreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider hover:text-rose-700 transition-colors"
                >
                  <Trash2 className="size-3.5" /> Gỡ ảnh
                </button>
              )}
            </div>

            {/* Slug Settings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <LinkIcon className="size-4 text-amber-600" />
                  Đường dẫn (Slug)
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setAutoSlug(!autoSlug)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-colors ${
                      autoSlug ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >
                    {autoSlug ? 'Tự động' : 'Thủ công'}
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClasses}
                placeholder="bai-viet-moi-nhat"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                {isEditing ? "Cập nhật bài viết" : "Đăng bài viết"}
              </button>
              <button
                type="button"
                onClick={() => onCancel ? onCancel() : router.back()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-600 border border-stone-200 rounded-xl font-bold hover:bg-stone-50 transition-all"
              >
                <X className="size-5" />
                Thoát
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </form>
  );
}