import { animalCallMix, type AnimalAudioListener } from './animalAudio';

/** The provider is used only by an offline asset tool; all playback stays local. */
export type HuntingSoundKind = 'bow_draw' | 'bow_release' | 'arrow_flesh' | 'arrow_ground' | 'skinning' | 'skinning_complete';
export interface HuntingSoundPosition { x: number; y: number; z: number }

export const HUNTING_SOUND_KINDS: readonly HuntingSoundKind[] = [
  'bow_draw', 'bow_release', 'arrow_flesh', 'arrow_ground', 'skinning', 'skinning_complete',
];
const KINDS: ReadonlySet<string> = new Set(HUNTING_SOUND_KINDS);
const MANIFEST_URL = `${import.meta.env.BASE_URL}assets/audio/hunting/manifest.json`;
const MAX_VOICES = 6;
const CAPTIONS: Record<HuntingSoundKind, string> = {
  bow_draw: '[Bowstring draws taut]', bow_release: '[Bowstring releases]', arrow_flesh: '[Arrow strikes an animal]',
  arrow_ground: '[Arrow strikes the ground]', skinning: '[Knife scrapes through hide]', skinning_complete: '[Pelt packed away]',
};

export function huntingSoundCaption(kind: HuntingSoundKind): string | null {
  return KINDS.has(kind) ? CAPTIONS[kind] : null;
}

export function huntingSoundCooldown(kind: HuntingSoundKind): number {
  return kind === 'bow_draw' ? 0.4 : kind === 'skinning' ? 0.5 : 0.1;
}

/** Player handling is centered; world impacts use the same camera-relative mix as animal calls. */
export function huntingSoundMix(position?: HuntingSoundPosition, listener?: AnimalAudioListener) {
  return position && listener
    ? animalCallMix({ id: 'hunting', species: 'boar', position, gain: 1 }, listener)
    : { gain: 0.36, pan: 0, distance: 0 };
}

interface Asset { id: HuntingSoundKind; url: string; sha256: string }
interface Voice { kind: HuntingSoundKind; source: AudioBufferSourceNode; clean: () => void }

function assetsFromManifest(value: unknown): Asset[] {
  if (typeof value !== 'object' || value === null || !('assets' in value) || !Array.isArray(value.assets)) return [];
  const entries = new Map<HuntingSoundKind, Asset>();
  for (const candidate of value.assets as unknown[]) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.id !== 'string' || !KINDS.has(entry.id) || typeof entry.sha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.path !== `public/assets/audio/hunting/${entry.id}.mp3`) continue;
    const id = entry.id as HuntingSoundKind;
    entries.set(id, { id, url: `${import.meta.env.BASE_URL}assets/audio/hunting/${id}.mp3`, sha256: entry.sha256 });
  }
  return [...entries.values()];
}

function integrity(hash: string) {
  return `sha256-${btoa(hash.match(/../g)!.map((value) => String.fromCharCode(parseInt(value, 16))).join(''))}`;
}

/** Owns six bounded recordings and at most six voices on the existing Effects → Master bus. */
export class HuntingAudio {
  private active = false;
  private disposed = false;
  private generation = 0;
  private readonly kindGenerations = new Map<HuntingSoundKind, number>();
  private readonly voices = new Set<Voice>();
  private readonly pending = new Map<HuntingSoundKind, number>();
  private readonly cooldowns = new Map<HuntingSoundKind, number>();
  private readonly buffers = new Map<HuntingSoundKind, Promise<AudioBuffer | null>>();
  private readonly requests = new Set<AbortController>();
  private manifest: Promise<Asset[]> | null = null;
  private state: 'not loaded' | 'loading' | 'ready' | 'unavailable' = 'not loaded';
  private decoded = 0;

  constructor(private ctx: AudioContext, private effects: AudioNode, private canPlay: () => boolean) {}

  get diagnostics() {
    return { state: this.state, voices: this.voices.size, pending: this.pending.size, decoded: this.decoded,
      skinning: [...this.voices].some((voice) => voice.kind === 'skinning') };
  }

  setActive(active: boolean) {
    if (this.disposed || active === this.active) return;
    this.active = active;
    if (!active) this.stop();
  }

  /** Stop a particular action, or invalidate every pending and playing effect. */
  stop(kind?: HuntingSoundKind) {
    if (kind !== undefined && !KINDS.has(kind)) return;
    if (kind === undefined) {
      this.generation++;
      this.pending.clear();
      this.cooldowns.clear();
    } else {
      this.kindGenerations.set(kind, (this.kindGenerations.get(kind) ?? 0) + 1);
      this.pending.delete(kind);
      this.cooldowns.delete(kind);
    }
    for (const voice of [...this.voices]) {
      if (kind !== undefined && kind !== voice.kind) continue;
      try { voice.source.stop(); } catch { /* already ended */ }
      voice.clean();
    }
  }

  private loadManifest() {
    if (this.manifest) return this.manifest;
    this.state = 'loading';
    const request = new AbortController();
    this.requests.add(request);
    this.manifest = fetch(MANIFEST_URL, { signal: request.signal, cache: 'no-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Hunting manifest unavailable');
        return assetsFromManifest(await response.json());
      }).then((assets) => { this.state = assets.length ? 'ready' : 'unavailable'; return assets; })
      .catch(() => { this.state = 'unavailable'; return [] as Asset[]; })
      .finally(() => { this.requests.delete(request); });
    return this.manifest;
  }

  private loadBuffer(kind: HuntingSoundKind): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(kind);
    if (cached) return cached;
    const buffer = this.loadManifest().then(async (assets) => {
      if (this.disposed) return null;
      const asset = assets.find((entry) => entry.id === kind);
      if (!asset) return null;
      const request = new AbortController();
      this.requests.add(request);
      try {
        const response = await fetch(asset.url, { signal: request.signal, integrity: integrity(asset.sha256) });
        if (!response.ok) return null;
        const data = await response.arrayBuffer();
        if (!data.byteLength || data.byteLength > 120_000 || this.disposed) return null;
        const decoded = await this.ctx.decodeAudioData(data);
        if (!Number.isFinite(decoded.duration) || decoded.duration < 0.2 || decoded.duration > 4 || this.disposed) return null;
        this.decoded++;
        return decoded;
      } catch { return null; }
      finally { this.requests.delete(request); }
    }).catch(() => null);
    this.buffers.set(kind, buffer);
    return buffer;
  }

  sound(kind: HuntingSoundKind, position?: HuntingSoundPosition, listener?: AnimalAudioListener) {
    if (this.disposed || !this.active || !this.canPlay() || !KINDS.has(kind)) return;
    const mix = huntingSoundMix(position, listener);
    if (mix.gain < 0.005 || this.pending.has(kind) || this.voices.size + this.pending.size >= MAX_VOICES) return;
    if (kind === 'skinning' && [...this.voices].some((voice) => voice.kind === kind)) return;
    const now = this.ctx.currentTime;
    if (now - (this.cooldowns.get(kind) ?? -Infinity) < huntingSoundCooldown(kind)) return;
    this.cooldowns.set(kind, now);
    const generation = this.generation;
    const kindGeneration = this.kindGenerations.get(kind) ?? 0;
    this.pending.set(kind, kindGeneration);
    void this.loadBuffer(kind).then((buffer) => {
      if (!buffer || this.disposed || !this.active || !this.canPlay() || generation !== this.generation
        || kindGeneration !== (this.kindGenerations.get(kind) ?? 0)) return;
      // Slow decoding must not replay an old shot. A still-active skinning loop remains useful.
      if (kind !== 'skinning' && this.ctx.currentTime - now > 2) return;
      this.play(kind, buffer, mix);
    }).catch(() => undefined).finally(() => {
      if (generation === this.generation && this.pending.get(kind) === kindGeneration) this.pending.delete(kind);
    });
  }

  private play(kind: HuntingSoundKind, buffer: AudioBuffer, mix: ReturnType<typeof huntingSoundMix>) {
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let pan: StereoPannerNode | null = null;
    try {
      source = this.ctx.createBufferSource();
      gain = this.ctx.createGain();
      pan = this.ctx.createStereoPanner();
      source.buffer = buffer;
      source.loop = kind === 'skinning';
      gain.gain.value = mix.gain * (kind === 'skinning' ? 0.7 : 1);
      pan.pan.value = mix.pan;
      source.connect(gain).connect(pan).connect(this.effects);
      const nodes = [source, gain, pan];
      let cleaned = false;
      const voice: Voice = { kind, source, clean: () => {
        if (cleaned) return;
        cleaned = true;
        for (const node of nodes) node.disconnect();
        source!.onended = null;
        this.voices.delete(voice);
      } };
      this.voices.add(voice);
      source.onended = voice.clean;
      try { source.start(); } catch { voice.clean(); }
    } catch { for (const node of [source, gain, pan]) node?.disconnect(); }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    for (const request of this.requests) request.abort();
    this.requests.clear();
    this.buffers.clear();
    this.kindGenerations.clear();
    this.decoded = 0;
  }
}
