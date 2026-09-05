/**
 * There is no UI here on purpose. The only clients are the backend's
 * `/internal/ai/*` calls (decision D-6).
 */
export default function Home() {
  return (
    <main style={{ padding: '3rem', maxWidth: '40rem' }}>
      <h1 style={{ fontSize: '1.25rem' }}>AK AI service</h1>
      <p>Internal service. Endpoints: /health, /internal/ai/generate, /internal/ai/reindex.</p>
    </main>
  );
}
