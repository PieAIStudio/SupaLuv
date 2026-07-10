import { useEffect, useState } from "react";

/**
 * Phase policy (ADR-0003 / owner): landscape-first. Portrait is not a full product
 * layout yet — show a clear rotate hint instead of claiming mobile portrait support.
 */
export function OrientationGate() {
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
      aria-label="请横屏游玩"
      data-testid="orientation-gate"
    >
      <div className="orientation-gate-card">
        <p className="orientation-gate-title">请横屏游玩</p>
        <p className="orientation-gate-body">
          当前版本是 16:9 影游舞台。竖屏只会把画面缩小，体验不完整。旋转设备或使用更宽的窗口后继续。
        </p>
        <p className="orientation-gate-en">Please rotate to landscape for this demo.</p>
      </div>
    </div>
  );
}
