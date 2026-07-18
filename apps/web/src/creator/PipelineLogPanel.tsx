import { useEffect, useRef, type RefObject } from "react";
import type { PipelineLogEvent } from "./api";

export function formatPipelineLogEvent(event: PipelineLogEvent): string {
  if (event.type === "step_start") {
    return `\n▶ ${event.step}: ${event.command}\n`;
  }
  if (event.type === "stdout" || event.type === "stderr") {
    return event.chunk;
  }
  if (event.type === "step_end") {
    return `${event.ok ? "✓" : "✗"} ${event.step} (exit ${event.exitCode ?? "?"})\n`;
  }
  if (event.type === "done" || event.type === "result") {
    return `\n${event.ok ? "任务完成" : "任务失败"}\n`;
  }
  if (event.type === "error") {
    return `\n错误：${event.message}\n`;
  }
  return "";
}

export function appendPipelineLog(prev: string, event: PipelineLogEvent): string {
  return `${prev}${formatPipelineLogEvent(event)}`;
}

interface PipelineLogPanelProps {
  readonly log: string;
  readonly testId?: string;
  readonly title?: string;
}

/** Shared streaming log panel used by map pipeline + task console. */
export function PipelineLogPanel({
  log,
  testId = "creator-pipeline-log",
  title,
}: PipelineLogPanelProps) {
  const logEndRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight });
  }, [log]);

  if (!log) return null;
  return (
    <div className="creator-pipeline-log-wrap" data-testid={testId}>
      {title ? <div className="creator-pipeline-log-title">{title}</div> : null}
      <pre ref={logEndRef as RefObject<HTMLPreElement>} className="creator-pipeline-log">
        {log}
      </pre>
    </div>
  );
}
