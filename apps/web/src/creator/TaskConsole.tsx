import { useCallback, useEffect, useState } from "react";
import {
  CreatorApiError,
  fetchCreatorTasks,
  runCreatorTask,
  type CreatorTaskDef,
  type CreatorTaskId,
  type PipelineLogEvent,
} from "./api";
import { appendPipelineLog, PipelineLogPanel } from "./PipelineLogPanel";

export function TaskConsole() {
  const [tasks, setTasks] = useState<readonly CreatorTaskDef[]>([]);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<CreatorTaskId | null>(null);
  const [log, setLog] = useState("");
  const [lastOk, setLastOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchCreatorTasks();
      setTasks(next.tasks);
      setBusyTask(next.busyTask);
    } catch (err) {
      setError(err instanceof CreatorApiError ? err.message : "无法加载任务列表。");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onEvent = useCallback((event: PipelineLogEvent) => {
    setLog((prev) => appendPipelineLog(prev, event));
  }, []);

  const runTask = useCallback(
    async (taskId: CreatorTaskId) => {
      if (runningId) return;
      setRunningId(taskId);
      setBusyTask(taskId);
      setLastOk(null);
      setLog(`开始任务：${taskId}\n`);
      try {
        const result = await runCreatorTask(taskId, onEvent);
        setLastOk(result.ok);
      } catch (err) {
        setLastOk(false);
        const message =
          err instanceof CreatorApiError
            ? err.status === 409
              ? `排他锁：${err.message}`
              : err.message
            : err instanceof Error
              ? err.message
              : String(err);
        onEvent({ type: "error", message });
      } finally {
        setRunningId(null);
        setBusyTask(null);
        void load();
      }
    },
    [load, onEvent, runningId],
  );

  if (error && tasks.length === 0) {
    return (
      <section className="creator-module-panel" data-testid="creator-task-console">
        <div className="creator-load-failure" role="alert">
          <h3>任务台读取失败</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            重试
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="creator-module-panel creator-task-console" data-testid="creator-task-console">
      <div className="creator-module-toolbar">
        <span className="creator-module-meta">
          AI 控制台 v1 · 复用 NDJSON 流式管线 · 同一时间只跑一个任务
        </span>
        {busyTask || runningId ? (
          <span className="creator-module-meta has-issues">运行中：{runningId ?? busyTask}</span>
        ) : (
          <span className="creator-module-meta">空闲</span>
        )}
        {lastOk === true ? <span className="creator-module-meta is-ok">上次成功</span> : null}
        {lastOk === false ? <span className="creator-module-meta has-issues">上次失败</span> : null}
      </div>

      <div className="creator-task-layout">
        <ul className="creator-task-list">
          {tasks.map((task) => {
            const isRunning = runningId === task.id;
            const disabled = Boolean(runningId);
            return (
              <li key={task.id} className="creator-task-card">
                <div>
                  <h3>{task.label}</h3>
                  <p>{task.description}</p>
                  <code>{task.id}</code>
                </div>
                <button
                  type="button"
                  className={`creator-pipeline-button${isRunning ? "" : ""}${lastOk === false && !runningId ? " is-failed" : ""}${lastOk === true && !runningId && !isRunning ? "" : ""}`}
                  disabled={disabled}
                  onClick={() => void runTask(task.id)}
                  data-testid={`creator-run-task-${task.id}`}
                >
                  {isRunning ? "运行中…" : "运行"}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="creator-task-log-pane">
          <h3>流式日志</h3>
          {log ? (
            <PipelineLogPanel log={log} testId="creator-task-log" />
          ) : (
            <p className="creator-empty-copy">点「运行」后，stdout/stderr 会流式出现在这里。</p>
          )}
        </div>
      </div>
    </section>
  );
}
