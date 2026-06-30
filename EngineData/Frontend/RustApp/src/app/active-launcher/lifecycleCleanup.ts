export type CleanupTask = () => void;

export type CleanupRegistry = {
  add(cleanup: CleanupTask | void | null | undefined): void;
  addTimeout(timeoutId: number): void;
  runAll(): void;
  bindBeforeUnload(): void;
};

export function createCleanupRegistry(): CleanupRegistry {
  const cleanups: CleanupTask[] = [];

  function add(cleanup: CleanupTask | void | null | undefined): void {
    if (typeof cleanup === "function") cleanups.push(cleanup);
  }

  function runAll(): void {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      try {
        cleanup?.();
      } catch (error) {
        console.warn("TranslateIT cleanup task failed", error);
      }
    }
  }

  return {
    add,
    addTimeout(timeoutId: number): void {
      add(() => window.clearTimeout(timeoutId));
    },
    runAll,
    bindBeforeUnload(): void {
      window.addEventListener("beforeunload", runAll, { once: true });
    },
  };
}

export function scheduleCleanupAwareDelay(
  registry: CleanupRegistry,
  delayMs: number,
  task: () => void,
): number {
  const timeoutId = window.setTimeout(task, delayMs);
  registry.addTimeout(timeoutId);
  return timeoutId;
}
