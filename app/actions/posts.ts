"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { getProfile } from "@/utils/supabase/queries";
import { createChangeRequest } from "./approvals";

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
  noStore();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const offset = (page - 1) * limit;
  const profile = await getProfile();

  // Optimize: exclude heavy 'content' column for list view
  let query = supabase
    .from("posts")
    .select("id, title, slug, excerpt, featured_image, author_id, status, published_at, created_at, updated_at", { count: "exact" });

  if (status !== 'all') {
    query = query
      .eq("status", status)
      .order("published_at", { ascending: false, nullsFirst: false });
  } else {
    // Admin/Editor view: show all statuses (draft, published, pending)
    if (profile?.role === 'admin' || profile?.role === 'editor') {
      query = query
        .order("status", { ascending: false }) // 'published' > 'pending' > 'draft'
        .order("updated_at", { ascending: false, nullsFirst: false });
    } else {
      // Non-admins only see published
      query = query
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });
    }
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching posts:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: data as Post[], count: count || 0, error: null };
}

export async function getPostBySlug(slug: string) {
  noStore();
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
  noStore();
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
  const profile = await getProfile();

  if (!profile) throw new Error("Unauthorized");

  const isAdmin = profile.role === "admin";
  const finalStatus = isAdmin ? (formData.status || "published") : "pending";

  // Create the post record
  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...formData,
      status: finalStatus,
      author_id: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { data: null, error: error.message };
  }

  // If Editor, create a change request for visibility
  if (!isAdmin) {
    await createChangeRequest(
      "insert",
      "posts",
      (data as Post).id,
      { ...formData, status: "published" } // Admin will approve to 'published'
    );
  }

  revalidatePath("/", "layout"); // Cập nhật toàn bộ layout để bài mới hiện ở trang chủ
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/posts");
  return { data: data as Post, error: null, pending: !isAdmin };
}

export async function updatePost(id: string, formData: Partial<Post>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const profile = await getProfile();

  if (!profile) throw new Error("Unauthorized");

  const isAdmin = profile.role === "admin";
  
  // If post is already pending, Editor can update directly
  const { data: currentPost } = await supabase
    .from("posts")
    .select("status")
    .eq("id", id)
    .single();

  const isPending = currentPost?.status === "pending";

  if (isAdmin || isPending) {
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
  } else {
    // Editor updating a published post -> Create change request
    const { error } = await createChangeRequest(
      "update",
      "posts",
      id,
      { ...formData, status: "published" }
    );
    if (error) return { error };
    return { success: true, pending: true, message: "Yêu cầu thay đổi đã được gửi chờ Admin duyệt." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/posts");
  return { error: null, success: true };
}

export async function deletePost(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const profile = await getProfile();

  if (!profile) throw new Error("Unauthorized");

  const isAdmin = profile.role === "admin";

  if (isAdmin) {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting post:", error);
      return { error: error.message };
    }
  } else {
    // Editor deleting post -> Create change request
    const { error } = await createChangeRequest(
      "delete",
      "posts",
      id
    );
    if (error) return { error };
    return { success: true, pending: true, message: "Yêu cầu xoá bài đã được gửi chờ Admin duyệt." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/posts");
  return { error: null, success: true };
}
