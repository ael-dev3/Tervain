export function cdpRequests(write: (message: { id: number; method: string; params: unknown }) => void, timeoutMs?: number): {
  nextId(): number;
  send(method: string, params?: unknown): Promise<any>;
  reply(message: { id?: number; error?: { message: string }; [key: string]: unknown }): boolean;
  close(): void;
};
