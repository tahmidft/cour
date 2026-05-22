import { createContext, useContext } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTrackedShows } from "../hooks/useTrackedShows";

const TrackedShowsContext = createContext(null);

export function TrackedShowsProvider({ children }) {
  const { user } = useAuth();
  const value = useTrackedShows(user?.id);
  return (
    <TrackedShowsContext.Provider value={value}>
      {children}
    </TrackedShowsContext.Provider>
  );
}

export function useTrackedShowsContext() {
  const ctx = useContext(TrackedShowsContext);
  if (!ctx) throw new Error("useTrackedShowsContext must be used within TrackedShowsProvider");
  return ctx;
}
