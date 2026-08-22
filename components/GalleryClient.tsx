"use client";

import { GalleryItem } from "@/types";
import { Plus, LayoutGrid, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GalleryGrid from "./GalleryGrid";
import UploadModal from "./modal/UploadModal";

export default function GalleryClient({
  initialItems,
  isAdmin,
}: {
  initialItems: GalleryItem[];
  isAdmin: boolean;
}) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const router = useRouter();

  // Sync with server items when they change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleUploadSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    // Refresh the server component to get new data
    router.refresh();
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    router.refresh();
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingItem(null), 300); // clear after animation
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 sm:mb-12">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="title">Phòng trưng bày</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Lưu giữ những kỷ niệm và khoảnh khắc đáng nhớ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/60">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Chế độ lưới"
            >
              <LayoutGrid className="size-4" />
              <span className="hidden xs:inline">Lưới</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "timeline"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="Chế độ dòng thời gian"
            >
              <Clock className="size-4" />
              <span className="hidden xs:inline">Dòng thời gian</span>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary whitespace-nowrap"
          >
            <Plus className="size-5" />
            <span>Thêm hình ảnh</span>
          </button>
        </div>
      </div>

      <GalleryGrid
        items={items}
        isAdmin={isAdmin}
        viewMode={viewMode}
        onEdit={handleEdit}
        onDeleteSuccess={handleDeleteSuccess}
      />

      <UploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleUploadSuccess}
        initialData={editingItem}
      />
    </>
  );
}
