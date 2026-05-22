import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const show = params.get("show");
    const all = params.get("all");
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid unsubscribe link");
      return;
    }

    const qs = new URLSearchParams();
    if (show) qs.set("show", show);
    if (all) qs.set("all", all);
    qs.set("token", token);

    fetch(`/api/unsubscribe?${qs.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setStatus("success");
        setMessage(
          data.type === "all"
            ? "All weekly reminders have been turned off."
            : "Weekly reminders for this show have been turned off."
        );
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Something went wrong");
      });
  }, [params]);

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
          maxWidth: 400,
          textAlign: "center",
          background: "#13131a",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 32,
        }}
      >
        {status === "loading" && (
          <p style={{ fontSize: 12, color: "#888" }}>Updating your preferences...</p>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 12, color: "#a0c4f8", marginBottom: 12, letterSpacing: "0.1em" }}>
              DONE
            </div>
            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7 }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <p style={{ fontSize: 12, color: "#c8222a" }}>{message}</p>
        )}
      </div>

      <Link
        to="/"
        style={{
          marginTop: 24,
          fontSize: 10,
          color: "#555",
          letterSpacing: "0.08em",
          textDecoration: "underline",
        }}
      >
        Back to COUR
      </Link>
    </div>
  );
}
