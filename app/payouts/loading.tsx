export default function Loading() {
  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ paddingTop: 32, marginBottom: 24 }}>
        <div className="bs-skeleton" style={{ width: 160, height: 28, marginBottom: 8 }} />
        <div className="bs-skeleton" style={{ width: 220, height: 12 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 400, borderRadius: 12 }} />
    </div>
  );
}
