import { useCallback, useMemo, useState } from "react";
import {
  AiEndingApiError,
  createAiEndingClient,
  type EndingSegmentPayload,
} from "./aiEndingClient";

const SESSION_KEY = "supaluv.aiEnding.active.v1";

export function useAiEndingSession(input: {
  getAccessToken: () => Promise<string | null>;
  characterBindings: Readonly<Record<string, unknown>>;
}) {
  const client = useMemo(
    () => createAiEndingClient({ getAccessToken: input.getAccessToken }),
    [input.getAccessToken],
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [segments, setSegments] = useState<readonly EndingSegmentPayload[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "active" | "paused" | "completed">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    (response: {
      checkpoint: { sessionId: string; sessionVersion: number };
      segment: EndingSegmentPayload;
    }) => {
      setSessionId(response.checkpoint.sessionId);
      setVersion(response.checkpoint.sessionVersion);
      setSegments((current) =>
        current.some((item) => item.sequence === response.segment.sequence)
          ? current
          : [...current, response.segment],
      );
      setStatus(response.segment.terminal ? "completed" : "active");
      if (response.segment.terminal) {
        localStorage.removeItem(SESSION_KEY);
      } else {
        localStorage.setItem(SESSION_KEY, response.checkpoint.sessionId);
      }
    },
    [],
  );

  const start = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const resumed = await client.resume(saved);
        setSessionId(resumed.session.id);
        setVersion(resumed.session.currentVersion);
        setSegments(resumed.checkpoints.map((item) => item.segment));
        setStatus(resumed.session.status === "completed" ? "completed" : "active");
        return;
      }
      accept(
        await client.start({
          storyRunId: crypto.randomUUID(),
          clientRunId: crypto.randomUUID(),
          clientSessionId: crypto.randomUUID(),
          clientActionId: crypto.randomUUID(),
          characterBindings: input.characterBindings,
        }),
      );
    } catch (caught) {
      const payment = caught instanceof AiEndingApiError && caught.status === 402;
      setStatus(payment ? "paused" : "idle");
      setError(
        payment
          ? "点数不足。最终章已暂停，充值后可以从这里继续。"
          : caught instanceof Error
            ? caught.message
            : "最终章暂不可用",
      );
    }
  }, [accept, client, input.characterBindings]);

  const advance = useCallback(
    async (action: { kind: "choice"; choiceId: string } | { kind: "free_text"; text: string }) => {
      if (!sessionId) return;
      setStatus("loading");
      setError(null);
      try {
        accept(
          await client.advance(sessionId, {
            clientActionId: crypto.randomUUID(),
            expectedVersion: version,
            action,
          }),
        );
      } catch (caught) {
        const payment = caught instanceof AiEndingApiError && caught.status === 402;
        setStatus(payment ? "paused" : "active");
        setError(
          payment
            ? "点数不足。进度没有丢失，充值后继续。"
            : caught instanceof Error
              ? caught.message
              : "推进失败",
        );
      }
    },
    [accept, client, sessionId, version],
  );

  return {
    sessionId,
    version,
    segments,
    current: segments.at(-1) ?? null,
    status,
    error,
    start,
    advance,
  };
}
