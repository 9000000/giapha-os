import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;
const BUTTON_ZOOM_STEP = 0.15;

export function usePanZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, scale: 1 });
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const stateAtDragStartRef = useRef<PanZoomState>({ x: 0, y: 0, scale: 1 });

  const clampScale = (s: number) => Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);

  // Zoom toward a specific point (cursor position relative to container)
  const zoomAtPoint = useCallback(
    (cursorX: number, cursorY: number, newScale: number) => {
      setState((prev) => {
        const clamped = clampScale(newScale);
        // Calculate the point in content-space before zoom
        // cursor position relative to the translated/scaled content
        const ratio = 1 - clamped / prev.scale;
        const newX = prev.x + (cursorX - prev.x) * ratio;
        const newY = prev.y + (cursorY - prev.y) * ratio;
        return { x: newX, y: newY, scale: clamped };
      });
    },
    [],
  );

  const handleZoomIn = useCallback(() => {
    const el = containerRef.current;
    const cx = el ? el.clientWidth / 2 : 0;
    const cy = el ? el.clientHeight / 2 : 0;
    setState((prev) => {
      const newScale = clampScale(prev.scale + BUTTON_ZOOM_STEP);
      const ratio = 1 - newScale / prev.scale;
      return {
        x: prev.x + (cx - prev.x) * ratio,
        y: prev.y + (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, [containerRef]);

  const handleZoomOut = useCallback(() => {
    const el = containerRef.current;
    const cx = el ? el.clientWidth / 2 : 0;
    const cy = el ? el.clientHeight / 2 : 0;
    setState((prev) => {
      const newScale = clampScale(prev.scale - BUTTON_ZOOM_STEP);
      const ratio = 1 - newScale / prev.scale;
      return {
        x: prev.x + (cx - prev.x) * ratio,
        y: prev.y + (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, [containerRef]);

  const handleResetZoom = useCallback(() => {
    setState({ x: 0, y: 0, scale: 1 });
  }, []);

  // Mouse wheel zoom at cursor position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Cursor position relative to the container element
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setState((prev) => {
        // Smooth zoom factor based on deltaY
        const zoomFactor = 1 - e.deltaY * ZOOM_SENSITIVITY;
        const newScale = clampScale(prev.scale * zoomFactor);
        const ratio = 1 - newScale / prev.scale;
        return {
          x: prev.x + (cursorX - prev.x) * ratio,
          y: prev.y + (cursorY - prev.y) * ratio,
          scale: newScale,
        };
      });
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [containerRef, zoomAtPoint]);

  // Pan via mouse drag (transform-based, not scroll-based)
  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    setIsPressed(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    stateAtDragStartRef.current = { ...state };
  };

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!isPressed) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true);
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      e.preventDefault();
      setState({
        ...stateAtDragStartRef.current,
        x: stateAtDragStartRef.current.x + dx,
        y: stateAtDragStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPressed(false);
    setIsDragging(false);
  };

  const handleClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  return {
    scale: state.scale,
    transformStyle: {
      transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
      transformOrigin: "0 0",
    } as React.CSSProperties,
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
