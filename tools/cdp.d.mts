export function browserCleanup(proc: import('node:child_process').ChildProcess, profile: string, release?: () => void): () => Promise<void>;
export function ownedDebugPort(contents: string): number | null;
export function cdpRequests(write: (message: { id: number; method: string; params: unknown }) => void, timeoutMs?: number): {
  nextId(): number;
  send(method: string, params?: unknown): Promise<any>;
  reply(message: { id?: number; error?: { message: string }; [key: string]: unknown }): boolean;
  close(): void;
};
export function openPage(url?:string,options?:{w?:number;h?:number;dpr?:number;init?:string|null;flags?:string[];headed?:boolean;requestTimeoutMs?:number}):Promise<{
  eval(js:string):Promise<any>;
  shot(file:string):Promise<string>;
  image(format?:'png'|'jpeg',quality?:number):Promise<Buffer>;
  transparent():Promise<any>;
  key(type:string,code:string,key?:string):Promise<any>;
  click(x:number,y:number):Promise<any>;
  wait(ms:number):Promise<void>;
  cdp(method:string,params?:object):Promise<any>;
  console():unknown[];
  close():Promise<void>;
}>;
