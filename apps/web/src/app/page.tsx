const foundationItems = [
  {
    title: "Frontend",
    body: "Next.js App Router foundation is ready for the secure player work."
  },
  {
    title: "Backend",
    body: "Node API foundation is ready for session and telemetry routes."
  },
  {
    title: "Shared Types",
    body: "Workspace package is ready for cross-app TypeScript contracts."
  }
];

export default function Home() {
  return (
    <main>
      <section className="shell">
        <p className="eyebrow">FocusTube Challenge</p>
        <h1>Zero-Distraction Engine Foundation</h1>
        <p className="summary">
          The initial application scaffold is in place. Challenge behavior such
          as focus monitoring, telemetry, sessions, and rate limiting is
          intentionally deferred to focused implementation commits.
        </p>

        <div className="status-grid" aria-label="Foundation status">
          {foundationItems.map((item) => (
            <article className="status-card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
