"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusGuard } from "../hooks/useFocusGuard";
import { createDemoSession, type VideoSession } from "../lib/api";

const fallbackSession: VideoSession = {
  sessionId: "local-demo",
  videoId: "demo-video-1",
  title: "FocusTube Demo Video",
  sourceUrl: "/demo/focustube-demo.mp4",
  createdAt: "Local preview",
  expiresAt: "Backend session unavailable"
};

type PlayerState = "loading" | "ready" | "playing" | "paused" | "ended" | "unavailable";
type SessionState = "loading" | "ready" | "unavailable";

export function SecureVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [session, setSession] = useState<VideoSession>(fallbackSession);
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [sessionMessage, setSessionMessage] = useState("Creating backend session...");
  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const { handlePlaybackStarted, pauseMessage } = useFocusGuard(videoRef);

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      setPlayerState("ready");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    createDemoSession().then((result) => {
      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setSession(result.session);
        setSessionState("ready");
        setSessionMessage("Backend session active.");
        return;
      }

      setSession(fallbackSession);
      setSessionState("unavailable");
      setSessionMessage(result.message);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="player-panel" aria-label="Secure video player shell">
      <div className="video-frame">
        <video
          ref={videoRef}
          className="secure-video"
          controls
          preload="metadata"
          src="/demo/focustube-demo.mp4"
          onLoadedMetadata={() => setPlayerState("ready")}
          onCanPlay={() => setPlayerState("ready")}
          onPlay={() => {
            setPlayerState("playing");
            handlePlaybackStarted();
          }}
          onPause={() => setPlayerState("paused")}
          onEnded={() => setPlayerState("ended")}
          onError={() => setPlayerState("unavailable")}
        >
          Your browser does not support the video element.
        </video>
      </div>

      {playerState === "unavailable" ? (
        <p className="alert alert-error">
          Demo video unavailable. Expected asset: /demo/focustube-demo.mp4.
        </p>
      ) : null}

      {pauseMessage ? (
        <p className="alert alert-warning">{pauseMessage}</p>
      ) : null}

      <div className="player-meta">
        <article>
          <p className="meta-label">Video</p>
          <h2>{session.title}</h2>
          <dl>
            <div>
              <dt>Video ID</dt>
              <dd>{session.videoId}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{session.sourceUrl}</dd>
            </div>
          </dl>
        </article>

        <article>
          <p className="meta-label">Session</p>
          <h2>{sessionState === "ready" ? "Connected" : "Local fallback"}</h2>
          <dl>
            <div>
              <dt>Session ID</dt>
              <dd>{session.sessionId}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{sessionMessage}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="status-row">
        <span className={`status-pill status-${playerState}`}>
          Player: {playerState}
        </span>
        <span className="status-pill status-placeholder">
          Focus guard active
        </span>
      </div>
    </section>
  );
}
