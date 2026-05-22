export default function Ticker({ accent, items = [] }) {
  const text =
    items.length > 0
      ? items.join("   ／   ")
      : "Track anime on COUR — search and add your first show";

  return (
    <div
      style={{
        background: accent,
        padding: "5px 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: inline-block;
          animation: ticker 28s linear infinite;
        }
      `}</style>
      <span
        className="ticker-inner"
        style={{ fontSize: 10, letterSpacing: "0.15em", color: "#fff" }}
      >
        {[...Array(4)].map((_, i) => (
          <span key={i}>
            <span style={{ opacity: 0.5, marginRight: 16 }}>●</span>
            {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </span>
    </div>
  );
}
