import { MouseEvent, useEffect, useRef, useState } from "react";

export function usePanZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.3));
  const handleResetZoom = () => setScale(1);

  // Thêm sự kiện con lăn chuột để zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent browser from scrolling the container
      e.preventDefault();

      // Determine the direction
      setScale((s) => {
        // e.deltaY < 0 (scroll up) -> Zoom IN
        // e.deltaY > 0 (scroll down) -> Zoom OUT
        // Use a slight smoother delta (0.05 or 0.1) based on standard mouse wheel
        const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
        return Math.min(Math.max(s + zoomDelta, 0.3), 2);
      });
    };

    // { passive: false } allows us to call e.preventDefault()
    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [containerRef]);

  // Center horizontally on initial render or when dependencies change
  // We leave it to the consumer to call a similar effect if needed,
  // or they can pass external triggers here. For simplicity, we just provide the tools.

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    setIsPressed(true);
    hasDraggedRef.current = false;
    setDragStart({ x: e.pageX, y: e.pageY });
    if (containerRef.current) {
      setScrollStart({
        left: containerRef.current.scrollLeft,
        top: containerRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!isPressed || !containerRef.current) return;

    // Only start dragging if moved a bit to allow simple clicks
    const dx = e.pageX - dragStart.x;
    const dy = e.pageY - dragStart.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true);
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      e.preventDefault();
      containerRef.current.scrollLeft = scrollStart.left - dx;
      containerRef.current.scrollTop = scrollStart.top - dy;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPressed(false);
    setIsDragging(false);
  };

  const handleClickCapture = (e: MouseEvent<HTMLElement>) => {
    // Intercept clicks if we were dragging, prevent links from opening
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  return {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  };
}
