import { useEffect, useState } from "react";
import { useLocale } from "../i18n";

/**
 * Phase policy (ADR-0003 / owner): landscape-first. Portrait is not a full product
 * layout yet — show a clear rotate hint instead of claiming mobile portrait support.
 */
export function OrientationGate() {
  const { t } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait) and (max-width: 900px)");
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div
      className="orientation-gate"
      role="dialog"
      aria-label={t("orientation.title")}
      data-testid="orientation-gate"
    >
      <div className="orientation-gate-card">
        <p className="orientation-gate-title">{t("orientation.title")}</p>
        <p className="orientation-gate-body">{t("orientation.body")}</p>
      </div>
    </div>
  );
}
