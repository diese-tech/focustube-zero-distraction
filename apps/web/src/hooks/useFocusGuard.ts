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

const clampRatio = (ratio: number) => Math.max(0, Math.min(1, ratio));

function measureVideoViewportRatio(video: HTMLVideoElement) {
  const rect = video.getBoundingClientRect();
  const videoArea = rect.width * rect.height;

  if (videoArea <= 0) {
    return 0;
  }

  const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
  const viewportTop = window.visualViewport?.offsetTop ?? 0;
  const viewportWidth =
    window.visualViewport?.width ??
    document.documentElement.clientWidth ??
    window.innerWidth;
  const viewportHeight =
    window.visualViewport?.height ??
    document.documentElement.clientHeight ??
    window.innerHeight;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;

  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, viewportRight) - Math.max(rect.left, viewportLeft)
  );
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop)
  );

  return clampRatio((visibleWidth * visibleHeight) / videoArea);
}

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
  const animationFrameRef = useRef<number | null>(null);

  const updateViewportRatio = useCallback((ratio: number) => {
    const nextRatio = clampRatio(ratio);

    focusStateRef.current.viewportRatio = nextRatio;
    setViewportRatio(nextRatio);
  }, []);

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

  const enforceViewportVisibility = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      updateViewportRatio(0);
      return;
    }

    const ratio = measureVideoViewportRatio(video);
    updateViewportRatio(ratio);

    if (ratio < visibilityThreshold && !video.paused && !video.ended) {
      pauseForReason("viewport_hidden");
    }
  }, [pauseForReason, updateViewportRatio, videoRef, visibilityThreshold]);

  const enforceFocus = useCallback(() => {
    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
    }
  }, [getBlockingReason, pauseForReason]);

  const stopVisibilityWatch = useCallback(() => {
    if (animationFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const startVisibilityWatch = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    const watch = () => {
      animationFrameRef.current = null;
      enforceViewportVisibility();

      const video = videoRef.current;

      if (video && !video.paused && !video.ended) {
        animationFrameRef.current = window.requestAnimationFrame(watch);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(watch);
  }, [enforceViewportVisibility, videoRef]);

  const handlePlaybackStarted = useCallback(() => {
    enforceViewportVisibility();

    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
      return;
    }

    lastPauseReasonRef.current = null;
    setPauseMessage(null);
    startVisibilityWatch();
  }, [
    enforceViewportVisibility,
    getBlockingReason,
    pauseForReason,
    startVisibilityWatch
  ]);

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
      enforceViewportVisibility();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange, {
      passive: true
    });
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportChange
      );
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange
      );
    };
  }, [enforceFocus, enforceViewportVisibility]);

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

        const ratio =
          entry?.intersectionRatio ?? measureVideoViewportRatio(video);
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
    enforceViewportVisibility();

    const handlePlaybackStopped = () => {
      stopVisibilityWatch();
    };

    video.addEventListener("pause", handlePlaybackStopped);
    video.addEventListener("ended", handlePlaybackStopped);

    return () => {
      observer.disconnect();
      video.removeEventListener("pause", handlePlaybackStopped);
      video.removeEventListener("ended", handlePlaybackStopped);
      stopVisibilityWatch();
    };
  }, [
    enforceFocus,
    enforceViewportVisibility,
    pauseForReason,
    stopVisibilityWatch,
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
