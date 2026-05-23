import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ background: "#0d0d12", minHeight: "100vh" }} />;
  }

  return (
    <div
      style={{
        background: "#0d0d12",
        minHeight: "100vh",
        color: "#e8e6df",
        fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif",
      }}
    >
      <div className="landing-banner" style={{ background: "#a0c4f8", padding: "5px 0", textAlign: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#fff" }}>
          ● ANIME TRACKING · EPISODE REMINDERS · NEW SEASON ALERTS ●
        </span>
      </div>

      <div className="landing-hero" style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div className="landing-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, letterSpacing: "0.12em", lineHeight: 1 }}>
          COUR
        </div>
        <div style={{ fontSize: 14, color: "#a0c4f8", letterSpacing: "0.3em", marginBottom: 32 }}>
          クール
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#d4d2cc",
            lineHeight: 1.8,
            marginBottom: 40,
            letterSpacing: "0.02em",
          }}
        >
          Track what you watch. Get weekly episode reminders. Know when a new season drops.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to={user ? "/dashboard" : "/auth"}
            style={{
              padding: "12px 28px",
              fontSize: 11,
              letterSpacing: "0.12em",
              background: "#a0c4f8",
              color: "#0d0d12",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {user ? "GO TO DASHBOARD" : "GET STARTED"}
          </Link>
          {!user && (
            <Link
              to="/auth"
              style={{
                padding: "12px 28px",
                fontSize: 11,
                letterSpacing: "0.12em",
                background: "transparent",
                color: "#a0c4f8",
                border: "1px solid #a0c4f8",
                textDecoration: "none",
              }}
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          fontSize: 11,
          color: "#b8b6b0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        made with ❤️ by a weeb
      </div>
    </div>
  );
}
