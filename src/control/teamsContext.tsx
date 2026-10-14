import { useSubscription } from "@shared/react/hooks";
import { useStore } from "@shared/react/store";
import type { TeamProfile } from "@shared/types";
import { createContext, useContext, type ReactNode } from "react";

const TeamsContext = createContext<TeamProfile[]>([]);

/** All teams (for pickers and the Teams page), subscribed once for the dashboard. */
export function TeamsProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const teams = useSubscription<TeamProfile[]>((cb) => store.teams.subscribeAll(cb), [], [store]);
  return <TeamsContext.Provider value={teams}>{children}</TeamsContext.Provider>;
}

export const useTeams = () => useContext(TeamsContext);
