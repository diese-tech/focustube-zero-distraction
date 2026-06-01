import { SecureVideoPlayer } from "../components/SecureVideoPlayer";

export default function Home() {
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">FocusTube Challenge</p>
        <h1>Zero-Distraction Engine Demo</h1>
        <p className="summary">
          A controlled HTML video player shell backed by the local demo asset.
          Focus enforcement, visibility monitoring, and telemetry batching are
          intentionally deferred to focused follow-up commits.
        </p>

        <SecureVideoPlayer />
      </section>
    </main>
  );
}
