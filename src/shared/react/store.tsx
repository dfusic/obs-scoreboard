import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeToLive, type LiveData } from "../liveFeed";
import type { DataStore } from "../store";

const StoreContext = createContext<DataStore | null>(null);
const LiveDataContext = createContext<LiveData | null>(null);

export function StoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): DataStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore() outside <StoreProvider>");
  return store;
}

/**
 * The page's one `subscribeToLive` subscription. Children read it with `useLiveData()`;
 * nothing below renders until the match has loaded.
 */
export function LiveDataProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const store = useStore();
  const [data, setData] = useState<LiveData | null>(null);
  useEffect(() => subscribeToLive(store, setData), [store]);
  return data ? <LiveDataContext.Provider value={data}>{children}</LiveDataContext.Provider> : fallback;
}

/** Provides LiveData from elsewhere (e.g. the output page's static mode), for `useLiveData()`. */
export function ProvideLiveData({ data, children }: { data: LiveData; children: ReactNode }) {
  return <LiveDataContext.Provider value={data}>{children}</LiveDataContext.Provider>;
}

export function useLiveData(): LiveData {
  const data = useContext(LiveDataContext);
  if (!data) throw new Error("useLiveData() outside <LiveDataProvider>");
  return data;
}
