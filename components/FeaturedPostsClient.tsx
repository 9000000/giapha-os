'use client';

import { useState, useEffect } from 'react';
import { getPosts } from '@/app/actions/posts';
import PostCard from './PostCard';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function FeaturedPostsClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedPosts = async () => {
      try {
        const { data } = await getPosts(1, 3, 'published');
        setPosts(data || []);
      } catch (error) {
        console.error('Error loading featured posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedPosts();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 bg-white/80 backdrop-blur-md p-8 sm:p-12 rounded-[3rem] border border-white/50 shadow-sm relative overflow-hidden group/container">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover/container:bg-amber-300/30 transition-colors" />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            Bài viết mới nhất
          </h2>
          <p className="text-stone-600 mt-3 max-w-2xl text-lg font-medium leading-relaxed">
            Khám phá những câu chuyện, kỷ niệm và thông báo mới nhất từ dòng họ.
          </p>
        </div>
        <Link 
          href="/dashboard?view=posts" 
          className="relative z-10 group inline-flex items-center gap-2 px-6 py-3 bg-white/50 hover:bg-white rounded-full text-stone-900 font-bold hover:text-amber-700 transition-all border border-stone-200/50 hover:border-amber-200 shadow-sm hover:shadow-md active:scale-95"
        >
          Xem tất cả bài viết
          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} layout="grid" />
        ))}
      </div>
    </section>
  );
}
