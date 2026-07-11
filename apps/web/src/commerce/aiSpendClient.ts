export interface AiSpendItem {
  readonly id: string;
  readonly label: string;
  readonly actionKind: string;
  readonly amountPowerUnits: number;
  readonly batteries: number;
  readonly scopeType: "character_pack" | "story_run" | "ai_ending_session";
  readonly scopeId?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface AiSpendAnalysis {
  readonly items: readonly AiSpendItem[];
  readonly groups: readonly {
    key: string;
    scopeType: AiSpendItem["scopeType"];
    scopeId?: string;
    totalPowerUnits: number;
    itemCount: number;
  }[];
  readonly totalPowerUnits: number;
  readonly totalBatteries: number;
}

export class AiSpendApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "AiSpendApiError";
  }
}

export function createAiSpendClient(options: {
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}) {
  return {
    async getAnalysis(signal?: AbortSignal): Promise<AiSpendAnalysis> {
      const token = await options.getAccessToken();
      if (!token) throw new AiSpendApiError(401, "AUTH_REQUIRED");
      const response = await (options.fetchImpl ?? fetch)(
        `${(options.baseUrl ?? "/api").replace(/\/$/, "")}/ai/spend`,
        { headers: { authorization: `Bearer ${token}` }, signal },
      );
      const payload = (await response.json().catch(() => ({}))) as AiSpendAnalysis & {
        error?: string;
      };
      if (!response.ok) {
        throw new AiSpendApiError(response.status, payload.error ?? `HTTP_${response.status}`);
      }
      return payload;
    },
  };
}
