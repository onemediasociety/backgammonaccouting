export default function Loading() {
  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ paddingTop: 32, marginBottom: 24 }}>
        <div className="bs-skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
        <div className="bs-skeleton" style={{ width: 150, height: 12 }} />
      </div>
      <div className="bs-skeleton" style={{ height: 80, marginBottom: 24, borderRadius: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 360, borderRadius: 12 }} />
    </div>
  );
}
