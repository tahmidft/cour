import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MODE_OPTIONS, NOTIFICATION_MODES } from "../lib/notificationModes";

const DISABLE_OPTIONS = [
  { id: "weekly_summary", label: "Weekly summaries (Sunday week)" },
  { id: "new_season_only", label: "New season alerts" },
  { id: "daily_digest", label: "Daily digests" },
  { id: "all", label: "All COUR emails" },
];

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [currentMode, setCurrentMode] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);

  const token = params.get("token");
  const disable = params.get("disable");
  const showId = params.get("show");
  const all = params.get("all");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid unsubscribe link");
      return;
    }

    if (disable || all === "true" || showId) {
      const qs = new URLSearchParams({ token });
      if (showId) qs.set("show", showId);
      if (all === "true") qs.set("all", "true");
      if (disable) qs.set("disable", disable);

      fetch(`/api/unsubscribe?${qs}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed");
          setStatus("success");
          setMessage(data.message || "Preferences updated.");
        })
        .catch((err) => {
          setStatus("error");
          setMessage(err.message);
        });
      return;
    }

    fetch(`/api/unsubscribe?token=${token}&preview=true`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setCurrentMode(data.notification_mode);
        setShowForm(true);
        setStatus("form");
        const initial = new Set();
        if (data.notification_mode && data.notification_mode !== NOTIFICATION_MODES.NONE) {
          initial.add(data.notification_mode);
        }
        setSelected(initial);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [token, disable, showId, all]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!token || selected.size === 0) {
      setMessage("Select at least one option");
      return;
    }
    setStatus("loading");
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        disable: [...selected],
        show: showId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed");
      return;
    }
    setStatus("success");
    setMessage(data.message || "Preferences updated.");
    setCurrentMode(data.notification_mode);
    setShowForm(false);
  }

  return (
    <div
      style={{
        background: "#0d0d12",
        minHeight: "100vh",
        color: "#e8e6df",
        fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 32,
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        COUR
      </div>
      <div style={{ fontSize: 9, color: "#a0c4f8", letterSpacing: "0.2em", marginBottom: 32 }}>
        クール
      </div>

      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#13131a",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 32,
        }}
      >
        {status === "loading" && (
          <p style={{ fontSize: 12, color: "#d4d2cc", textAlign: "center" }}>
            Updating your preferences...
          </p>
        )}

        {status === "form" && showForm && (
          <form onSubmit={submitForm}>
            <div
              style={{
                fontSize: 12,
                color: "#a0c4f8",
                marginBottom: 8,
                letterSpacing: "0.1em",
                textAlign: "center",
              }}
            >
              EMAIL PREFERENCES
            </div>
            <p style={{ fontSize: 11, color: "#d4d2cc", lineHeight: 1.7, marginBottom: 16 }}>
              Current:{" "}
              <strong style={{ color: "#f5f4f0" }}>
                {MODE_OPTIONS.find((o) => o.id === currentMode)?.label || currentMode || "—"}
              </strong>
            </p>
            <p style={{ fontSize: 10, color: "#b8b6b0", marginBottom: 12 }}>
              Choose what to turn off:
            </p>
            {DISABLE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  fontSize: 11,
                  color: "#e8e6df",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => toggle(opt.id)}
                />
                {opt.label}
              </label>
            ))}
            <button
              type="submit"
              style={{
                width: "100%",
                marginTop: 16,
                padding: "12px 0",
                fontSize: 11,
                letterSpacing: "0.1em",
                background: "#a0c4f8",
                color: "#0d0d12",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              UPDATE PREFERENCES
            </button>
          </form>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                fontSize: 12,
                color: "#a0c4f8",
                marginBottom: 12,
                letterSpacing: "0.1em",
                textAlign: "center",
              }}
            >
              DONE
            </div>
            <p style={{ fontSize: 12, color: "#d4d2cc", lineHeight: 1.7, textAlign: "center" }}>
              {message}
            </p>
          </>
        )}

        {status === "error" && (
          <p style={{ fontSize: 12, color: "#c8222a", textAlign: "center" }}>{message}</p>
        )}
      </div>

      <Link
        to={token ? `/dashboard/settings` : "/"}
        style={{
          marginTop: 24,
          fontSize: 10,
          color: "#d4d2cc",
          letterSpacing: "0.08em",
          textDecoration: "underline",
        }}
      >
        {token ? "Open settings in COUR" : "Back to COUR"}
      </Link>
    </div>
  );
}
