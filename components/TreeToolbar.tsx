import { ZoomIn, ZoomOut } from "lucide-react";
import BaseToolbar, { BaseToolbarProps } from "./BaseToolbar";

interface TreeToolbarProps extends BaseToolbarProps {
  scale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
}

export default function TreeToolbar({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  ...baseProps
}: TreeToolbarProps) {
  return (
    <BaseToolbar {...baseProps}>
      {/* Zoom Controls */}
      <div className="flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden transition-opacity h-10">
        <button
          onClick={handleZoomOut}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Thu nhỏ"
          disabled={scale <= 0.3}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 h-full hover:bg-stone-100/50 text-stone-600 transition-colors text-xs font-medium min-w-[50px] text-center border-x border-stone-200/50"
          title="Đặt lại"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Phóng to"
          disabled={scale >= 2}
        >
          <ZoomIn className="size-4" />
        </button>
      </div>
    </BaseToolbar>
  );
}
