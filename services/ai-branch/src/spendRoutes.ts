import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { verifyBearerToken } from "./authGate.js";
import { sendJson } from "./httpUtils.js";
import {
  createSupabasePersistenceFromClient,
  type SideBranchSpendRecorder,
  type SpendReceiptInput,
  type SpendReceiptReader,
} from "./persistence/index.js";

type SpendModules = {
  readonly spendReceipts: SpendReceiptReader;
  readonly sideBranchSpend: SideBranchSpendRecorder;
};

let modules: SpendModules | undefined;
function configuredSpendModules(): SpendModules {
  if (modules) return modules;
  const url = process.env.SWIMMER_CORE_SUPABASE_URL?.trim();
  const key = process.env.SWIMMER_CORE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("Spend analysis database credentials are required");
  modules = createSupabasePersistenceFromClient(
    createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  );
  return modules;
}

export async function recordShortBranchReceipt(input: {
  ownerId: string;
  reservationId: string;
  amountPowerUnits: number;
  storyId: string;
  sceneId: string;
}): Promise<void> {
  if (!input.reservationId || input.amountPowerUnits <= 0) return;
  // Adapter supplies actionKind/scopeType; caller only passes delivery facts.
  await configuredSpendModules().sideBranchSpend.recordSideBranchSpend({
    ownerId: input.ownerId,
    walletReservationId: input.reservationId,
    amountPowerUnits: input.amountPowerUnits,
    metadata: { storyId: input.storyId, sceneId: input.sceneId },
  });
}

export async function handleSpendRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  dependencies: {
    verifyAuth?: typeof verifyBearerToken;
    store?: SpendReceiptReader;
  } = {},
): Promise<boolean> {
  if (url.pathname !== "/ai/spend" || req.method !== "GET") return false;
  try {
    const auth = await (dependencies.verifyAuth ?? verifyBearerToken)(req.headers.authorization);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }
    const receipts = await (
      dependencies.store ?? configuredSpendModules().spendReceipts
    ).listSpendReceipts(auth.userId);
    sendJson(res, 200, groupSpendReceipts(receipts));
  } catch {
    sendJson(res, 503, { error: "SPEND_ANALYSIS_UNAVAILABLE" });
  }
  return true;
}

export function groupSpendReceipts(receipts: readonly (SpendReceiptInput & { id: string })[]) {
  const labels: Record<SpendReceiptInput["actionKind"], string> = {
    character_base: "生成角色基准形象",
    character_regeneration: "重新生成角色形象",
    character_mood_pack: "生成角色表情包",
    character_mood: "生成单个角色表情",
    ai_side_choice: "生成 AI 剧情选项",
    ai_ending_segment: "推进 AI 最终章",
    ai_ending_still: "生成最终章静帧",
  };
  const unique = [...new Map(receipts.map((item) => [item.id, item])).values()];
  const items = unique.map((item) => ({
    id: item.id,
    label: labels[item.actionKind],
    actionKind: item.actionKind,
    amountPowerUnits: item.amountPowerUnits,
    batteries: item.amountPowerUnits / 100,
    scopeType: item.scopeType,
    scopeId: item.scopeId,
    metadata: item.metadata,
  }));
  const grouped = new Map<
    string,
    {
      key: string;
      scopeType: SpendReceiptInput["scopeType"];
      scopeId?: string;
      totalPowerUnits: number;
      itemCount: number;
    }
  >();
  for (const item of items) {
    const key = `${item.scopeType}:${item.scopeId ?? "unscoped"}`;
    const current = grouped.get(key);
    grouped.set(key, {
      key,
      scopeType: item.scopeType,
      ...(item.scopeId ? { scopeId: item.scopeId } : {}),
      totalPowerUnits: (current?.totalPowerUnits ?? 0) + item.amountPowerUnits,
      itemCount: (current?.itemCount ?? 0) + 1,
    });
  }
  const totalPowerUnits = items.reduce((sum, item) => sum + item.amountPowerUnits, 0);
  return {
    items,
    groups: [...grouped.values()],
    totalPowerUnits,
    totalBatteries: totalPowerUnits / 100,
  };
}
