/** Locally packaged animal recordings. No provider credentials or network API enter the game. */
export type AnimalSoundSpecies = 'bear' | 'lion' | 'tiger' | 'wolf' | 'cat' | 'dog' | 'boar' | 'deer' | 'stag';
export interface AnimalCallEvent {
  id: string;
  species: AnimalSoundSpecies;
  position: { x: number; y: number; z: number };
  gain: number;
  /** Zero-based variant; each species has at most two locally generated calls. */
  variant?: number;
}
export interface AnimalAudioListener { x: number; y: number; z: number; heading: number }

const SPECIES: ReadonlySet<string> = new Set(['bear', 'lion', 'tiger', 'wolf', 'cat', 'dog', 'boar', 'deer', 'stag']);
const MAX_VOICES = 4;
export const ANIMAL_CALL_COOLDOWN_SECONDS = 7;
const HEADROOM = 0.36;
const MAX_DISTANCE = 38;
const REFERENCE_DISTANCE = 4;
const MANIFEST_URL = `${import.meta.env.BASE_URL}assets/audio/animals/manifest.json`;
const CAPTIONS: Record<AnimalSoundSpecies, string> = {
  bear: '[A bear grunts]', lion: '[A lion growls]', tiger: '[A tiger calls]', wolf: '[A wolf calls]',
  cat: '[A cat meows]', dog: '[A dog barks]', boar: '[A boar grunts]', deer: '[A deer calls]', stag: '[A stag bellows]',
};

export function animalCallCaption(species: AnimalSoundSpecies): string | null {
  const caption = CAPTIONS[species];
  return typeof caption === 'string' ? caption : null;
}

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Facing +Z at heading zero, the listener's right side is -X. */
export function animalCallMix(call: AnimalCallEvent, listener: AnimalAudioListener) {
  const values = [call.position.x, call.position.y, call.position.z, listener.x, listener.y, listener.z, listener.heading];
  if (!values.every(Number.isFinite)) return { gain: 0, pan: 0, distance: Infinity };
  const dx = call.position.x - listener.x;
  const dy = call.position.y - listener.y;
  const dz = call.position.z - listener.z;
  const distance = Math.hypot(dx, dy, dz);
  const horizon = Math.hypot(dx, dz);
  const pan = horizon > 0.001 ? (-dx * Math.cos(listener.heading) + dz * Math.sin(listener.heading)) / horizon : 0;
  // Roll off naturally, then fade smoothly to silence at the culling boundary.
  const edge = unit((MAX_DISTANCE - distance) / 8);
  const attenuation = REFERENCE_DISTANCE / Math.max(REFERENCE_DISTANCE, distance);
  return { gain: HEADROOM * unit(call.gain) * attenuation * edge,
    pan: Math.max(-1, Math.min(1, pan)), distance };
}

interface Asset { id: string; species: AnimalSoundSpecies; url: string; sha256: string }
interface Voice { source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode; clean: () => void }
type AssetState = 'not loaded' | 'loading' | 'pending generation' | 'ready' | 'unavailable';

function assetsFromManifest(value: unknown): Asset[] {
  if (typeof value !== 'object' || value === null || !('assets' in value) || !Array.isArray(value.assets)) return [];
  const entries: Asset[] = [];
  for (const candidate of value.assets as unknown[]) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.id !== 'string' || typeof entry.species !== 'string' || !SPECIES.has(entry.species)
      || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)
      || !new RegExp(`^${entry.species}-call-[12]$`).test(entry.id)
      || entry.path !== `public/assets/audio/animals/${entry.id}.mp3`) continue;
    entries.push({ id: entry.id, species: entry.species as AnimalSoundSpecies,
      url: `${import.meta.env.BASE_URL}assets/audio/animals/${entry.id}.mp3`, sha256: entry.sha256 });
  }
  // Ignore additional manifest entries; memory and filename vocabulary stay bounded.
  return entries.slice(0, 18);
}

function integrity(hash: string) {
  const bytes = hash.match(/../g)!.map((value) => String.fromCharCode(parseInt(value, 16))).join('');
  return `sha256-${btoa(bytes)}`;
}

/** The existing Effects → Master graph owns volume; this class owns only one-shot voices. */
export class AnimalAudio {
  private active = false;
  private disposed = false;
  private generation = 0;
  private readonly voices = new Set<Voice>();
  private readonly pending = new Set<string>();
  private readonly cooldowns = new Map<string, number>();
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly requests = new Set<AbortController>();
  private manifest: Promise<Asset[]> | null = null;
  private state: AssetState = 'not loaded';
  private decoded = 0;

  constructor(private ctx: AudioContext, private effects: AudioNode, private canPlay: () => boolean) {}

  get diagnostics() {
    return { state: this.state, voices: this.voices.size, pending: this.pending.size, decoded: this.decoded };
  }

  setActive(active: boolean) {
    if (this.disposed || active === this.active) return;
    this.active = active;
    if (!active) this.stop();
  }

  /** Pausing, hiding, muting or disposing invalidates pending playback and stops live calls. */
  stop() {
    this.generation++;
    this.pending.clear();
    for (const voice of [...this.voices]) {
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
        if (!response.ok) throw new Error('Animal manifest unavailable');
        return assetsFromManifest(await response.json());
      }).then((assets) => {
        this.state = assets.length ? 'ready' : 'pending generation';
        return assets;
      }).catch(() => { this.state = 'unavailable'; return [] as Asset[]; })
      .finally(() => { this.requests.delete(request); });
    return this.manifest;
  }

  private async loadBuffer(id: string) {
    const assets = await this.loadManifest();
    if (this.disposed) return null;
    const asset = assets.find((entry) => entry.id === id);
    if (!asset) return null;
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const request = new AbortController();
    this.requests.add(request);
    const buffer = fetch(asset.url, { signal: request.signal, integrity: integrity(asset.sha256) })
      .then(async (response) => {
        if (!response.ok) throw new Error('Animal recording unavailable');
        const data = await response.arrayBuffer();
        if (data.byteLength > 200_000 || this.disposed) return null;
        const decoded = await this.ctx.decodeAudioData(data);
        if (decoded.duration <= 0 || decoded.duration > 5 || this.disposed) return null;
        this.decoded++;
        return decoded;
      }).catch(() => null).finally(() => { this.requests.delete(request); });
    this.buffers.set(id, buffer);
    return buffer;
  }

  call(event: AnimalCallEvent, listener: AnimalAudioListener) {
    if (this.disposed || !this.active || !this.canPlay() || !SPECIES.has(event.species) || !event.id || event.id.length > 100) return;
    const mix = animalCallMix(event, listener);
    if (mix.gain < 0.005 || this.pending.has(event.id) || this.voices.size + this.pending.size >= MAX_VOICES) return;
    const now = this.ctx.currentTime;
    if (now - (this.cooldowns.get(event.id) ?? -Infinity) < ANIMAL_CALL_COOLDOWN_SECONDS) return;
    this.cooldowns.set(event.id, now);
    if (this.cooldowns.size > 128) this.cooldowns.delete(this.cooldowns.keys().next().value!);
    this.pending.add(event.id);
    const generation = this.generation;
    const variant = Number.isFinite(event.variant) ? ((Math.floor(event.variant!) % 2) + 2) % 2 : 0;
    void this.loadBuffer(`${event.species}-call-${variant + 1}`).then((buffer) => {
      if (!buffer || this.disposed || generation !== this.generation || !this.active || !this.canPlay()) return;
      // A slow network load must not play a stale call long after its visible event.
      if (this.ctx.currentTime - now > 3) return;
      this.play(buffer, mix);
    }).catch(() => undefined).finally(() => {
      if (generation === this.generation) this.pending.delete(event.id);
    });
  }

  private play(buffer: AudioBuffer, mix: ReturnType<typeof animalCallMix>) {
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let pan: StereoPannerNode | null = null;
    try {
      source = this.ctx.createBufferSource();
      gain = this.ctx.createGain();
      pan = this.ctx.createStereoPanner();
      source.buffer = buffer;
      gain.gain.value = mix.gain;
      pan.pan.value = mix.pan;
      source.connect(gain).connect(pan).connect(this.effects);
      const nodes = [source, gain, pan];
      let cleaned = false;
      const voice: Voice = { source, gain, pan, clean: () => {
        if (cleaned) return;
        cleaned = true;
        for (const node of nodes) node.disconnect();
        source!.onended = null;
        this.voices.delete(voice);
      } };
      this.voices.add(voice);
      source.onended = voice.clean;
      try { source.start(); } catch { voice.clean(); return; }
    } catch {
      for (const node of [source, gain, pan]) node?.disconnect();
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    for (const request of this.requests) request.abort();
    this.requests.clear();
    this.buffers.clear();
    this.cooldowns.clear();
    this.decoded = 0;
  }
}
