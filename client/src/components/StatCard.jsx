export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <section className="stat-card">
      <div className="stat-icon">{Icon ? <Icon size={20} /> : null}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </section>
  );
}
