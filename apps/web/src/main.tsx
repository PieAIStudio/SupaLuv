import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@pieai/swimmer-ui-kit/styles.css";
// Brand Latin fonts (Baloo 2 / Geist) — UIKit tokens name them but ships the
// files separately; without this import every weight token collapses to the
// system fallback.
import "@pieai/swimmer-ui-kit/fonts.css";
// CJK: UIKit's token stack already lists 'Noto Sans SC' and deliberately does
// not bundle multi-MB CJK files — the product wires them (per UIKit fonts.css
// doc). fontsource splits each family into unicode-range slices, so browsers
// only fetch the glyph blocks a screen actually uses.
import "@fontsource-variable/noto-sans-sc/index.css";
import "@fontsource-variable/noto-serif-sc/index.css";
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
