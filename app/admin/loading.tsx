export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="bs-skeleton" style={{ width: 120, height: 28, marginBottom: 8 }} />
        <div className="bs-skeleton" style={{ width: 180, height: 12 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="bs-skeleton" style={{ height: 360, borderRadius: 12 }} />
        <div className="bs-skeleton" style={{ height: 360, borderRadius: 12 }} />
      </div>
    </div>
  );
}
