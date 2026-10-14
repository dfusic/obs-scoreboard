import { createStore } from "@shared/store";
import { StoreProvider } from "@shared/react/store";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider store={createStore()}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
