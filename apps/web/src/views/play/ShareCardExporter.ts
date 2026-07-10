/**
 * A5 — export a 16:9 share card PNG from ending stats.
 * Pure canvas; no server. Call from ChapterEndCard.
 */

export interface ShareCardEchoLine {
  readonly label: string;
  readonly percentSame: number;
}

export interface ShareCardPayload {
  readonly orderId: string;
  readonly dignity: number;
  readonly impulse: number;
  readonly toneLabel: string;
  readonly usedAi: boolean;
  readonly flavor: string;
  /** Optional global-echo highlights for the share PNG. */
  readonly echoLines?: readonly ShareCardEchoLine[];
  /** Optional custom lead names (E19). */
  readonly leadNames?: { readonly male: string; readonly female: string };
}

export async function downloadShareCard(payload: ShareCardPayload): Promise<void> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  // Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1a1210");
  grad.addColorStop(0.5, "#0b0c12");
  grad.addColorStop(1, "#121820");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Accent bar
  ctx.fillStyle = "rgba(232, 160, 106, 0.85)";
  ctx.fillRect(0, 0, 12, height);

  ctx.fillStyle = "#fff6ee";
  ctx.font = "600 42px 'Avenir Next', 'PingFang SC', sans-serif";
  ctx.fillText("超级爱人 · 第 1 章", 64, 100);

  ctx.fillStyle = "rgba(255, 220, 180, 0.85)";
  ctx.font = "28px 'Avenir Next', 'PingFang SC', sans-serif";
  ctx.fillText(`订单 ${payload.orderId}`, 64, 160);

  ctx.fillStyle = "#fff6ee";
  ctx.font = "500 34px 'Avenir Next', 'PingFang SC', sans-serif";
  ctx.fillText(`羞耻 ${payload.dignity}  ·  冲动 ${payload.impulse}`, 64, 240);
  ctx.fillText(payload.toneLabel, 64, 300);

  if (payload.leadNames) {
    ctx.fillStyle = "rgba(255, 220, 180, 0.75)";
    ctx.font = "24px 'Avenir Next', 'PingFang SC', sans-serif";
    ctx.fillText(`主演 · ${payload.leadNames.male} / ${payload.leadNames.female}`, 64, 348);
  }

  if (payload.usedAi) {
    ctx.fillStyle = "rgba(140, 190, 255, 0.95)";
    ctx.font = "26px 'Avenir Next', 'PingFang SC', sans-serif";
    ctx.fillText("路径：含 AI 旁支 · 已汇合主线", 64, payload.leadNames ? 396 : 360);
  }

  let y = payload.usedAi ? (payload.leadNames ? 450 : 420) : payload.leadNames ? 400 : 380;

  if (payload.echoLines && payload.echoLines.length > 0) {
    ctx.fillStyle = "rgba(232, 160, 106, 0.95)";
    ctx.font = "600 24px 'Avenir Next', 'PingFang SC', sans-serif";
    ctx.fillText("全球回声", 64, y);
    y += 40;
    ctx.fillStyle = "rgba(255, 245, 236, 0.9)";
    ctx.font = "24px 'Avenir Next', 'PingFang SC', sans-serif";
    for (const line of payload.echoLines.slice(0, 3)) {
      const row = `「${line.label}」· ${line.percentSame}% 同选`;
      ctx.fillText(row.slice(0, 42), 64, y);
      y += 36;
    }
    y += 8;
  }

  ctx.fillStyle = "rgba(255, 245, 236, 0.78)";
  ctx.font = "26px 'Avenir Next', 'PingFang SC', sans-serif";
  wrapText(ctx, payload.flavor, 64, Math.min(y, height - 120), width - 128, 40);

  ctx.fillStyle = "rgba(255, 245, 236, 0.45)";
  ctx.font = "22px 'Avenir Next', sans-serif";
  ctx.fillText("SupaLuv Demo · noncanonical", 64, height - 48);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) {
    throw new Error("PNG export failed");
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `supaluv-${payload.orderId}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const chars = [...text];
  let line = "";
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
  }
}
