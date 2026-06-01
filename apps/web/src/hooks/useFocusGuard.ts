"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type FocusPauseReason = "document_hidden" | "window_blur" | "viewport_hidden";

const focusPauseMessages: Record<FocusPauseReason, string> = {
  document_hidden: "Playback paused because the tab is no longer visible.",
  window_blur: "Playback paused because the window lost focus.",
  viewport_hidden: "Paused: video below 90% viewport visibility"
};

type FocusState = {
  documentVisible: boolean;
  windowFocused: boolean;
  viewportRatio: number;
};

export function useFocusGuard(
  videoRef: RefObject<HTMLVideoElement | null>,
  visibilityThreshold = 0.9
) {
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);
  const [viewportRatio, setViewportRatio] = useState(1);
  const focusStateRef = useRef<FocusState>({
    documentVisible: true,
    windowFocused: true,
    viewportRatio: 1
  });
  const lastPauseReasonRef = useRef<FocusPauseReason | null>(null);

  const updateViewportRatio = useCallback((ratio: number) => {
    const nextRatio = Math.max(0, Math.min(1, ratio));

    focusStateRef.current.viewportRatio = nextRatio;
    setViewportRatio(nextRatio);
  }, []);

  const measureVideoViewportRatio = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return 0;
    }

    const rect = video.getBoundingClientRect();
    const videoArea = rect.width * rect.height;

    if (videoArea <= 0) {
      return 0;
    }

    const visibleWidth = Math.max(
      0,
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
    );
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
    );

    return (visibleWidth * visibleHeight) / videoArea;
  }, [videoRef]);

  const getBlockingReason = useCallback((): FocusPauseReason | null => {
    const focusState = focusStateRef.current;

    if (!focusState.documentVisible) {
      return "document_hidden";
    }

    if (!focusState.windowFocused) {
      return "window_blur";
    }

    if (focusState.viewportRatio < visibilityThreshold) {
      return "viewport_hidden";
    }

    return null;
  }, [visibilityThreshold]);

  const pauseForReason = useCallback(
    (reason: FocusPauseReason) => {
      const video = videoRef.current;

      if (!video || video.paused || video.ended) {
        return;
      }

      video.pause();

      if (lastPauseReasonRef.current !== reason) {
        lastPauseReasonRef.current = reason;
        setPauseMessage(focusPauseMessages[reason]);
      }
    },
    [videoRef]
  );

  const checkViewportVisibility = useCallback(() => {
    const ratio = measureVideoViewportRatio();
    updateViewportRatio(ratio);

    if (ratio < visibilityThreshold) {
      pauseForReason("viewport_hidden");
    }
  }, [measureVideoViewportRatio, pauseForReason, updateViewportRatio, visibilityThreshold]);

  const enforceFocus = useCallback(() => {
    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
    }
  }, [getBlockingReason, pauseForReason]);

  const handlePlaybackStarted = useCallback(() => {
    checkViewportVisibility();

    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
      return;
    }

    lastPauseReasonRef.current = null;
    setPauseMessage(null);
  }, [checkViewportVisibility, getBlockingReason, pauseForReason]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      focusStateRef.current.documentVisible =
        document.visibilityState === "visible";
      enforceFocus();
    };

    const handleWindowFocus = () => {
      focusStateRef.current.windowFocused = true;
    };

    const handleWindowBlur = () => {
      focusStateRef.current.windowFocused = false;
      enforceFocus();
    };

    const handleViewportChange = () => {
      checkViewportVisibility();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [checkViewportVisibility, enforceFocus]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        const ratio = entry?.intersectionRatio ?? measureVideoViewportRatio();
        updateViewportRatio(ratio);

        if (ratio < visibilityThreshold && !video.paused) {
          pauseForReason("viewport_hidden");
          return;
        }

        enforceFocus();
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 0.9, 1]
      }
    );

    observer.observe(video);
    checkViewportVisibility();

    return () => {
      observer.disconnect();
    };
  }, [
    checkViewportVisibility,
    enforceFocus,
    measureVideoViewportRatio,
    pauseForReason,
    updateViewportRatio,
    videoRef,
    visibilityThreshold
  ]);

  return {
    handlePlaybackStarted,
    pauseMessage,
    viewportRatio
  };
}
