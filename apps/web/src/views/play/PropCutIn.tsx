import { useEffect, useRef, useState } from "react";
import type { PropCutInDefinition } from "@supaluv/content";
import { useLocale } from "../../i18n";

interface PropCutInProps {
  readonly definition: PropCutInDefinition;
  readonly onDismiss: () => void;
  readonly onRestoreFocus: (previousFocus: HTMLElement | null) => void;
}

export function PropCutIn({ definition, onDismiss, onRestoreFocus }: PropCutInProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  const [imageFailed, setImageFailed] = useState(false);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) {
      dialog.showModal();
    }
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    let closing = false;
    const requestClose = () => {
      if (closing) {
        return;
      }
      closing = true;
      if (dialog.open) {
        dialog.close();
      }
      onDismissRef.current();
    };
    const handleCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        // This cut-in intentionally has one action. Keep browser/chromium edge
        // cases from moving focus outside the native modal top layer.
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("keydown", handleKeyDown, true);
      if (dialog.open) {
        dialog.close();
      }
      window.setTimeout(() => onRestoreFocus(previousFocus), 0);
    };
  }, [definition.id, onRestoreFocus]);

  return (
    <dialog
      ref={dialogRef}
      className="prop-cutin-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`prop-cutin-title-${definition.id}`}
      aria-describedby={`prop-cutin-text-${definition.id}`}
      data-testid="prop-cutin-dialog"
      data-prop-id={definition.id}
      data-image-status={imageFailed ? "failed" : "ready"}
    >
      <div className="prop-cutin-frame">
        <header className="prop-cutin-chrome">
          <span className="prop-cutin-badge">{t("propCutIn.badge")}</span>
          <h2 id={`prop-cutin-title-${definition.id}`}>{definition.title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="prop-cutin-close"
            data-testid="prop-cutin-close"
            onClick={onDismiss}
          >
            {t("propCutIn.close")}
          </button>
        </header>

        <div className="prop-cutin-visual" data-testid="prop-cutin-visual">
          {!imageFailed ? (
            <img
              src={definition.imageUrl}
              alt={definition.altText}
              onError={() => setImageFailed(true)}
              data-testid="prop-cutin-image"
            />
          ) : (
            <div className="prop-cutin-fallback" data-testid="prop-cutin-fallback" role="status">
              <strong>{t("propCutIn.loadFailed")}</strong>
              <span>{definition.title}</span>
            </div>
          )}
        </div>

        <section className="prop-cutin-transcript" aria-label={t("propCutIn.fullText")}>
          <span>{t("propCutIn.fullText")}</span>
          <p id={`prop-cutin-text-${definition.id}`}>{definition.accessibleText}</p>
        </section>
      </div>
    </dialog>
  );
}
