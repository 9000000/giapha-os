"use client";

import { Post, deletePost } from "@/app/actions/posts";
import { motion } from "framer-motion";
import { Calendar, User, Edit3, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostCardProps {
  post: Post;
  index: number;
  isAdmin?: boolean;
  layout?: "grid" | "list";
  onSelect?: (post: Post) => void;
  onEdit?: (postId: string) => void;
  onDeleted?: () => void;
}

export default function PostCard({ post, index, isAdmin, layout = "list", onSelect, onEdit, onDeleted }: PostCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : post.status === 'pending' ? "Đang chờ duyệt" : "Mới";

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    
    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      if (result.error) throw new Error(result.error);
      
      if (result.pending) {
        alert("Yêu cầu xoá đã được gửi và đang chờ Admin phê duyệt.");
      }
      
      onDeleted?.();
      router.refresh();
    } catch (err) {
      alert("Lỗi khi xóa bài viết: " + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isList = layout === "list";

  const handleClick = () => {
    if (onSelect) {
      onSelect(post);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500 flex flex-col ${isList ? 'sm:flex-row h-full' : 'h-full'} ${isDeleting ? 'opacity-50 grayscale pointer-events-none' : ''}`}
    >
      {/* Thumbnail */}
      <div 
        onClick={handleClick}
        className={`relative overflow-hidden shrink-0 cursor-pointer ${isList ? 'w-full sm:w-48 lg:w-64 h-[200px]' : 'aspect-video w-full'}`}
      >
        <div className={`w-full h-full ${isList ? 'sm:absolute sm:inset-0' : ''}`}>
        {post.featured_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center text-stone-300">
            <Edit3 className="size-10" />
          </div>
        )}
        {post.status === 'draft' && (
          <div className="absolute top-2 left-2 bg-stone-900/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest backdrop-blur-sm">
            Bản nháp
          </div>
        )}
        {post.status === 'pending' && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest backdrop-blur-sm shadow-sm">
            Chờ duyệt
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex items-center gap-3 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formattedDate}
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center gap-1">
            <User className="size-3" />
            Ban biên tập
          </span>
        </div>

        <div 
          onClick={handleClick}
          className="block group/title cursor-pointer"
        >
          <h3 className={`font-serif font-bold text-stone-900 group-hover/title:text-amber-700 transition-colors mb-2 line-clamp-2 leading-tight ${isList ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>
            {post.title}
          </h3>
        </div>

        {post.excerpt && (
          <div 
            onClick={handleClick}
            className="block cursor-pointer"
          >
            <p className="text-stone-600 text-sm md:text-base line-clamp-3 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-end gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(post.id);
              }}
              className="p-2 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
              title="Chỉnh sửa"
            >
              <Edit3 className="size-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              title="Xóa bài"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
