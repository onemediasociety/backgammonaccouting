export default function Loading() {
  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ paddingTop: 32, marginBottom: 24 }}>
        <div className="bs-skeleton" style={{ width: 180, height: 32, marginBottom: 8 }} />
        <div className="bs-skeleton" style={{ width: 120, height: 12 }} />
      </div>
      <div className="bs-skeleton" style={{ height: 56, marginBottom: 20, borderRadius: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 400, borderRadius: 12, marginBottom: 24 }} />
      <div className="bs-skeleton" style={{ height: 300, borderRadius: 12 }} />
    </div>
  );
}
