"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image: string | null;
  author_id: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPosts(page: number = 1, limit: number = 10, status: string = 'published') {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const offset = (page - 1) * limit;

  // Optimize: exclude heavy 'content' column for list view
  let query = supabase
    .from("posts")
    .select("id, title, slug, excerpt, featured_image, author_id, status, published_at, created_at, updated_at", { count: "exact" });

  if (status !== 'all') {
    query = query
      .eq("status", status)
      .order("published_at", { ascending: false, nullsFirst: false });
  } else {
    // Admin view: published first, then by updated_at
    query = query
      .order("status", { ascending: false })
      .order("updated_at", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching posts:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: data as Post[], count: count || 0, error: null };
}

export async function getPostBySlug(slug: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, featured_image, author_id, status, published_at, created_at, updated_at, content")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching post by slug:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Post, error: null };
}

export async function getPostById(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, featured_image, author_id, status, published_at, created_at, updated_at, content")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post by ID:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Post, error: null };
}

export async function createPost(formData: Partial<Post>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...formData,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: data as Post, error: null };
}

export async function updatePost(id: string, formData: Partial<Post>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("posts")
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating post:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function deletePost(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting post:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
