"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { Post } from "@/app/actions/posts";
import PostCard from "./PostCard";
import PostForm from "./PostForm";
import { usePosts } from "@/hooks/usePosts";
import {
  FileText,
  Plus,
  Calendar,
  User,
  ChevronLeft,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Pencil,
} from "lucide-react";

interface DashboardPostsViewProps {
  isAdmin?: boolean;
}

export default function DashboardPostsView({
  isAdmin,
}: DashboardPostsViewProps) {
  const {
    selectedPostId,
    setSelectedPostId,
    isCreatingPost,
    setIsCreatingPost,
    editingPostId,
    setEditingPostId,
  } = useDashboard();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Use the optimized posts hook with caching
  const {
    posts,
    loading,
    error,
    totalCount,
    page,
    setPage,
    refresh,
    getPostDetail,
    clearCache,
  } = usePosts({
    page: 1,
    limit: 10,
    status: isAdmin ? "all" : "published",
    autoLoad: true,
  });

  // Load selected post detail
  useEffect(() => {
    if (selectedPostId) {
      getPostDetail(selectedPostId).then(setSelectedPost);
    } else {
      setSelectedPost(null);
    }
  }, [selectedPostId, getPostDetail]);

  // Load editing post detail
  useEffect(() => {
    if (editingPostId) {
      getPostDetail(editingPostId).then(setEditingPost);
    } else {
      setEditingPost(null);
    }
  }, [editingPostId, getPostDetail]);

  const handleBack = () => {
    setSelectedPostId(null);
    setIsCreatingPost(false);
    setEditingPostId(null);
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-8 text-amber-600 animate-spin" />
        <p className="text-stone-500 font-medium">Đang tải bài viết...</p>
      </div>
    );
  }

  // CREATE VIEW
  if (isCreatingPost) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        <PostForm
          onSuccess={async () => {
            clearCache();
            if (page !== 1) setPage(1);
            await refresh();
            handleBack();
          }}
          onCancel={handleBack}
        />
      </div>
    );
  }

  // EDIT VIEW
  if (editingPostId) {
    if (!editingPost)
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-amber-600" />
        </div>
      );
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        <PostForm
          initialData={editingPost}
          isEditing={true}
          onSuccess={async () => {
            clearCache();
            await refresh();
            
            // Re-fetch the updated post to update the detail view cache
            const updatedPost = await getPostDetail(editingPost.id);
            setSelectedPost(updatedPost);
            
            setEditingPostId(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onCancel={() => {
            setEditingPostId(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    );
  }

  // DETAIL VIEW
  if (selectedPost) {
    const otherPosts = posts
      .filter((p) => p.id !== selectedPost.id)
      .slice(0, 3);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-bold text-stone-600 hover:text-amber-700 hover:bg-white shadow-sm border border-stone-200/50 transition-all active:scale-95"
          >
            <ChevronLeft className="size-4" />
            Quay lại danh sách
          </button>

          {isAdmin && (
            <button
               onClick={() => {
                 setEditingPostId(selectedPost.id);
                 window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/50 backdrop-blur-sm rounded-full text-sm font-bold text-amber-800 hover:bg-amber-200 hover:text-amber-900 shadow-sm border border-amber-200 transition-all active:scale-95"
            >
              <Pencil className="size-4" />
              Chỉnh sửa bài viết
            </button>
          )}
        </div>

        <article className="space-y-8 pb-12 bg-white rounded-2xl p-8 shadow-sm border border-stone-200">
          <header className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
              {selectedPost.status === "draft"
                ? "Bản nháp"
                : "Tài liệu dòng họ"}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 leading-tight">
              {selectedPost.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-stone-500 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Calendar className="size-4" />
                {selectedPost.published_at
                  ? new Date(selectedPost.published_at).toLocaleDateString(
                      "vi-VN",
                    )
                  : "Chưa xuất bản"}
              </span>
              <span className="flex items-center gap-2">
                <User className="size-4" />
                Ban biên tập
              </span>
            </div>
          </header>

          <div
            className="rendered-html-content prose prose-stone max-w-none text-stone-600 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: selectedPost.content || "" }}
          />
        </article>

        {/* RELATED POSTS SECTION */}
        {otherPosts.length > 0 && (
          <div className="mt-16 space-y-10 bg-white/80 backdrop-blur-md p-6 sm:p-10 rounded-[2.5rem] border border-white/50 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-bold text-stone-900 border-l-4 border-amber-500 pl-4 py-1">
                Bài viết khác
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherPosts.map((otherPost) => (
                <div
                  key={otherPost.id}
                  onClick={() => {
                    setSelectedPostId(otherPost.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group cursor-pointer space-y-3"
                >
                  <div className="aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                    {otherPost.featured_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={otherPost.featured_image}
                        alt={otherPost.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <FileText className="size-8" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                    {otherPost.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {otherPost.published_at
                        ? new Date(otherPost.published_at).toLocaleDateString(
                            "vi-VN",
                          )
                        : "Mới"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/40 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
            <FileText className="size-5 sm:size-6 text-amber-600 shrink-0" />
            Bài viết & Tài liệu
          </h2>
          <p className="text-stone-600 text-xs sm:text-sm mt-1.5 sm:mt-1 font-medium">
            Các câu chuyện, kỷ niệm và kiến thức dòng họ.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreatingPost(true)}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-amber-600 text-white rounded-full font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
          >
            <Plus className="size-4" />
            Tạo bài viết
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-red-600" />
          <p className="text-red-800">{error}</p>
          <button
            onClick={refresh}
            className="ml-auto text-red-600 hover:text-red-800 font-medium"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              isAdmin={isAdmin}
              layout="list"
              onSelect={() => setSelectedPostId(post.id)}
              onEdit={() => setEditingPostId(post.id)}
              onDeleted={refresh}
            />
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 border-dashed p-12 text-center space-y-3">
            <div className="size-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="size-6 text-stone-300" />
            </div>
            <p className="text-stone-500 font-medium">
              Chưa có bài viết nào được đăng.
            </p>
          </div>
        )}
      </div>

      {totalCount > 10 && (
        <div className="flex items-center justify-center gap-4 pt-8 border-t border-stone-100">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-1 text-sm font-bold text-stone-500 hover:text-amber-700 disabled:opacity-30 disabled:hover:text-stone-500 transition-colors"
          >
            <ChevronLeft className="size-4" />
            Trang trước
          </button>
          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.ceil(totalCount / 10) },
              (_, i) => i + 1,
            ).map((pageNumber: number) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`size-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                  page === pageNumber
                    ? "bg-amber-100 text-amber-800"
                    : "text-stone-400 hover:bg-stone-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button
            disabled={page >= Math.ceil(totalCount / 10)}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 text-sm font-bold text-stone-500 hover:text-amber-700 disabled:opacity-30 disabled:hover:text-stone-500 transition-colors"
          >
            Trang sau
            <ArrowLeft className="size-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
