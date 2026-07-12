export class AiEndingApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "AiEndingApiError";
  }
}

export function describeAiEndingFailure(caught: unknown, fallback: string): string {
  if (!(caught instanceof AiEndingApiError)) return fallback;
  if (caught.status === 401) return "登录状态已失效，请重新登录后继续。";
  if (caught.status === 409) return "结局进度已在别处更新，请返回后重新进入最终章。";
  if (caught.status >= 500) {
    return "这段 AI 内容未通过质量检查，请重试。失败调用不会扣款。";
  }
  return fallback;
}

export function createAiEndingClient(options: {
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.baseUrl ?? "/api").replace(/\/$/, "");
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken();
    if (!token) throw new AiEndingApiError(401, "AUTH_REQUIRED");
    const response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok)
      throw new AiEndingApiError(response.status, payload.error ?? `HTTP_${response.status}`);
    return payload;
  }
  return {
    start(input: {
      storyRunId: string;
      clientRunId: string;
      clientSessionId: string;
      clientActionId: string;
      characterBindings: Readonly<Record<string, unknown>>;
      signal?: AbortSignal;
    }) {
      const { signal, ...payload } = input;
      return request<EndingActionResponse>("/ai/endings/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      });
    },
    advance(
      sessionId: string,
      input: {
        clientActionId: string;
        expectedVersion: number;
        action: { kind: "choice"; choiceId: string } | { kind: "free_text"; text: string };
        signal?: AbortSignal;
      },
    ) {
      const { signal, ...payload } = input;
      return request<EndingActionResponse>(
        `/ai/endings/sessions/${encodeURIComponent(sessionId)}/actions`,
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal,
        },
      );
    },
    resume(sessionId: string, signal?: AbortSignal) {
      return request<EndingResumeResponse>(
        `/ai/endings/sessions/${encodeURIComponent(sessionId)}/resume`,
        {
          method: "POST",
          signal,
        },
      );
    },
  };
}

export interface EndingChoicePayload {
  id: string;
  label: string;
  actionSummary: string;
}
export interface EndingSegmentPayload {
  sequence: number;
  text: string;
  beats: readonly string[];
  choices: readonly EndingChoicePayload[];
  terminal: boolean;
  outcomeAnchor?: string;
  backgroundKey?: string;
}
export interface EndingActionResponse {
  checkpoint: { sessionId: string; sessionVersion: number };
  segment: EndingSegmentPayload;
  idempotent: boolean;
}
export interface EndingResumeResponse {
  session: { id: string; currentVersion: number; currentSequence: number; status: string };
  checkpoints: readonly { segment: EndingSegmentPayload }[];
}
