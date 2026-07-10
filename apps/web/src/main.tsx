import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@pieai/swimmer-ui-kit/styles.css";
import { initProductAnalytics, trackEvent } from "./analytics/productAnalytics";
import { AuthProvider } from "./auth/AuthContext";
import { LocaleProvider } from "./i18n";
import { App } from "./App";
import "./styles.css";

void initProductAnalytics().then(() => {
  trackEvent({ name: "app_open" });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LocaleProvider>
  </StrictMode>,
);
