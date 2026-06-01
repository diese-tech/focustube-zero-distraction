"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type FocusPauseReason = "document_hidden" | "window_blur" | "viewport_hidden";

const focusPauseMessages: Record<FocusPauseReason, string> = {
  document_hidden: "Playback paused because the tab is no longer visible.",
  window_blur: "Playback paused because the window lost focus.",
  viewport_hidden: "Playback paused because the player is not mostly visible."
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
  const focusStateRef = useRef<FocusState>({
    documentVisible: true,
    windowFocused: true,
    viewportRatio: 1
  });
  const lastPauseReasonRef = useRef<FocusPauseReason | null>(null);

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

  const enforceFocus = useCallback(() => {
    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
    }
  }, [getBlockingReason, pauseForReason]);

  const handlePlaybackStarted = useCallback(() => {
    const reason = getBlockingReason();

    if (reason) {
      pauseForReason(reason);
      return;
    }

    lastPauseReasonRef.current = null;
    setPauseMessage(null);
  }, [getBlockingReason, pauseForReason]);

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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enforceFocus]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        focusStateRef.current.viewportRatio = entry?.intersectionRatio ?? 0;
        enforceFocus();
      },
      {
        threshold: [0, visibilityThreshold, 1]
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [enforceFocus, videoRef, visibilityThreshold]);

  return {
    handlePlaybackStarted,
    pauseMessage
  };
}
