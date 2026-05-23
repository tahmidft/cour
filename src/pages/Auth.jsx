import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env"
      );
      return;
    }
    setLoading(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (authError) setError(authError.message);
    else setSent(true);
    setLoading(false);
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
      <div style={{ background: "#a0c4f8", padding: "5px 0", textAlign: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#fff" }}>
          ● COUR · MAGIC LINK LOGIN ●
        </span>
      </div>

      <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 24px" }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32,
              letterSpacing: "0.1em",
              textAlign: "center",
            }}
          >
            COUR
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#a0c4f8",
              letterSpacing: "0.2em",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            クール
          </div>
        </Link>

        <div
          style={{
            background: "#13131a",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 28,
          }}
        >
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#a0c4f8", marginBottom: 8, letterSpacing: "0.1em" }}>
                CHECK YOUR EMAIL
              </div>
              <p style={{ fontSize: 12, color: "#d4d2cc", lineHeight: 1.7 }}>
                We sent a magic link to <strong style={{ color: "#e8e6df" }}>{email}</strong>.
                Click it to sign in.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                style={{
                  marginTop: 20,
                  fontSize: 10,
                  color: "#d4d2cc",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                }}
              >
                USE DIFFERENT EMAIL
              </button>
            </div>
          ) : user ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#a0c4f8", marginBottom: 8, letterSpacing: "0.1em" }}>
                ALREADY SIGNED IN
              </div>
              <p style={{ fontSize: 12, color: "#d4d2cc", lineHeight: 1.7, marginBottom: 16 }}>
                Your session stays active in this browser until you sign out.
              </p>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  background: "#a0c4f8",
                  color: "#0d0d12",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                GO TO DASHBOARD
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <label
                style={{
                  fontSize: 9,
                  letterSpacing: "0.15em",
                  color: "#d4d2cc",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 13,
                  background: "#0d0d12",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e8e6df",
                  marginBottom: 16,
                  outline: "none",
                }}
              />
              {error && (
                <p style={{ fontSize: 11, color: "#c8222a", marginBottom: 12 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  background: "#a0c4f8",
                  color: "#0d0d12",
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loading ? "SENDING..." : "SEND MAGIC LINK"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#d4d2cc" }}>
          No password needed. Stay signed in until you sign out.{" "}
          <span
            role="button"
            tabIndex={0}
            onClick={() => navigate("/")}
            style={{ color: "#a0c4f8", cursor: "pointer" }}
          >
            Back home
          </span>
        </p>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          fontSize: 11,
          color: "#b8b6b0",
          marginTop: 40,
        }}
      >
        made with ❤️ by a weeb
      </div>
    </div>
  );
}
