import { resultTransfer, runSheetJob, type SheetJob } from './sheetJob';

/** A worker that paints people's sheets (sheetPool.ts). */
interface WorkerScope {
  onmessage: ((e: MessageEvent<{ id: number; job: SheetJob }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;
scope.onmessage = (e) => {
  const { id, job } = e.data;
  try {
    const result = runSheetJob(job);
    scope.postMessage({ id, result }, resultTransfer(result));
  } catch (err) {
    scope.postMessage({ id, error: String(err) }, []);
  }
};
