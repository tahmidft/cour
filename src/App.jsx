import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import { TrackedShowsProvider } from "./context/TrackedShowsContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Discover from "./pages/Discover";
import Settings from "./pages/Settings";
import Unsubscribe from "./pages/Unsubscribe";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const waitingForCallback =
    typeof window !== "undefined" &&
    loading &&
    (() => {
      const q = new URLSearchParams(window.location.search);
      return q.has("code") || q.has("token_hash");
    })();

  if (loading || waitingForCallback) {
    return <div style={{ background: "#0d0d12", minHeight: "100vh" }} />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <ThemeProvider>
        <TrackedShowsProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
        </TrackedShowsProvider>
      </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
