export default function Loading() {
  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, paddingTop: 32 }}>
        <div>
          <div className="bs-skeleton" style={{ width: 140, height: 28, marginBottom: 8 }} />
          <div className="bs-skeleton" style={{ width: 100, height: 12 }} />
        </div>
      </div>
      <div className="bs-skeleton" style={{ height: 56, marginBottom: 24, borderRadius: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 220, borderRadius: 12, marginBottom: 28 }} />
      <div className="bs-skeleton" style={{ height: 300, borderRadius: 12 }} />
    </div>
  );
}
