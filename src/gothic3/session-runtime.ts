/** Original Session::Start/Stop/Pause/Resume and concrete GameApp frame order.
 * The host supplies the named engine subcalls. A missing subcall stops execution
 * with its already-applied prefix retained. This controller never labels a
 * partially loaded world, a renderer or a completed callback as a playable game.
 */
import rulesText from '../../assets/gothic3/session-runtime/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';

const rules = JSON.parse(rulesText) as { schema: string; warmupFrames: number;
  warmupSleepMilliseconds: number; startupClockFactor: number; inputs: Record<string, string> };
if (rules.schema !== 'gothic3-native-session-runtime-rules-v1' || rules.warmupFrames !== 20 ||
    rules.warmupSleepMilliseconds !== 100 || rules.startupClockFactor !== 12 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3') {
  throw new Error('Original session/application receipt differs');
}

export interface NativeSessionTrace {
  sequence: number; operation: string; state: 'attempted' | 'applied'; source: string;
  value?: number | string | boolean | null;
}
export type NativeSessionResult =
  | { supported: true; trace: readonly NativeSessionTrace[]; gameplayReady: false }
  | { supported: false; reason: string; trace: readonly NativeSessionTrace[]; gameplayReady: false };
export type NativeSessionCallback = 'OnPlayerChanged' | 'OnInit' | 'OnGameStartUp' | 'OnReturnFromMenu';

/** Actual gCClock_PS receiver, not a second calendar copy. Setters include their
 * property notification chain; the arithmetic-only clock is insufficient. */
export interface NativeSessionClock {
  setHour(hour: number): NativeValue<void>;
  setFactor(factor: number): NativeValue<void>;
  resume(): NativeValue<void>;
  pause(): NativeValue<void>;
}
export interface NativeSessionPlayerMemory {
  isTutorialEnabled(index: 1): NativeValue<number>;
  enableTutorial(index: 1, enabled: false): NativeValue<void>;
}
export interface NativeSessionCameraObject<E extends object, P extends object> {
  /** Captured camera property-set virtual+150. */
  bindPlayer(player: E | null): NativeValue<void>;
  propertyObject(): NativeValue<P | null>;
  propertyObjectVirtual34(object: P): NativeValue<void>;
}

export interface NativeSessionHost<E extends object, W extends object, G extends object, A extends object,
  P extends object> {
  /** SceneAdmin semantics require genuinely registered source entities. */
  countEntitiesByName(name: 'PC_Hero' | 'PC_Camera'): NativeValue<number>;
  entityByName(name: 'PC_Hero' | 'PC_Camera'): NativeValue<E | null>;
  dynamicCast(entity: E | null): NativeValue<E | null>;
  currentWorld(): NativeValue<W | null>;
  worldEntity(world: W): NativeValue<E | null>;
  clock(entity: E): NativeValue<NativeSessionClock | null>;
  playerMemory(entity: E): NativeValue<NativeSessionPlayerMemory | null>;
  /** Original selector18 +2037bcd0 wrapper assignment, including the captured
   * reflective GetPropertyObject/virtual30 reference-retention calls. */
  cameraObject(entity: E): NativeValue<NativeSessionCameraObject<E, P> | null>;
  printEntityDebug(entity: E): NativeValue<void>;
  enableDeactivation(entity: E, enabled: false): NativeValue<void>;
  renderAlpha(entity: E, alpha: 1, recursive: true): NativeValue<void>;
  cacheIn(entity: E, recursive: false): NativeValue<void>;
  /** ScriptAdmin is fetched at each source call, before the actual subcall. */
  scriptAdmin(): NativeValue<A>;
  script(admin: A, callback: NativeSessionCallback, self: null, other: null,
    argument: 0, session: NativeSessionRuntime<E, W, G, A, P>): NativeValue<number>;
  navigationAdmin(argument: 0): NativeValue<object>;
  compileNavigation(admin: object, force: boolean, emptyString: ''): NativeValue<number>;
  /** Parsed signed32 command-line "time" value, including GetInteger(default0,false).
   * null means option absent, not failed parsing. */
  commandLineTime(): NativeValue<number | null>;
  clearGuiEntities(gui: G): NativeValue<void>;
  closeMenu(gui: G): NativeValue<void>;
  closePage(gui: G): NativeValue<void>;
  engineComponentEnable(enabled: boolean): NativeValue<void>;
  channel0(): NativeValue<object | null>;
  overrideMute(channel: object, muted: boolean): NativeValue<void>;
  localizeStartTutorial(key: 'TUT_Start'): NativeValue<string>;
  openTutorial(gui: G, localizedText: string): NativeValue<void>;
  /** Source PlayVideo is synchronous. Browser host awaits decoding/playback
   * before the following component/audio calls; skipping is a separate policy. */
  playVideo(path: 'G3_Intro.bik'): Promise<NativeValue<void>>;
  sleep(milliseconds: 100): Promise<NativeValue<void>>;
  threadPoolEnable(enabled: boolean): NativeValue<void>;
  setupThreadPoolByte(): NativeValue<number>;
  message(severity: 3, text: string): NativeValue<void>;
}

export interface NativeApplicationFrameHost<S extends object> {
  /** Native byte return: the original branches compare AL with 1. */
  panicState(): NativeValue<number>;
  validateMemory(): NativeValue<void>;
  keyboard(): NativeValue<void>;
  mouse(): NativeValue<void>;
  moduleProcess(): NativeValue<void>;
  onProcess(): NativeValue<void>;
  sceneAdmin(): NativeValue<S | null>;
  entityAdminProcess(scene: S): NativeValue<void>;
  modulePostProcess(): NativeValue<void>;
  physicsSimulate(): NativeValue<void>;
  killEntities(scene: S): NativeValue<void>;
  render(force: true): NativeValue<void>;
}
export interface NativeSessionApplication {
  navigationCompileResult: number;
  isEditorRunning(): number;
  setPaused(enabled: boolean): void;
  setWarmup(enabled: boolean): void;
  onRun(): NativeSessionResult;
}

function byte(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(name + ' requires a native byte');
  return value;
}
function u32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error(name + ' requires uint32');
  return value;
}
function i32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error(name + ' requires int32');
  return value;
}
function float32(value: number, name: string): number {
  if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error(name + ' requires finite float32');
  return value;
}
class NativeCallJournal {
  readonly rows: NativeSessionTrace[] = [];
  failure: string | null = null;
  record(operation: string, state: NativeSessionTrace['state'], source: string,
    value?: NativeSessionTrace['value']): void {
    this.rows.push({ sequence: this.rows.length, operation, state, source, value });
  }
  call<T>(operation: string, source: string, fn: () => NativeValue<T>): T {
    if (this.failure) throw new Error(this.failure);
    this.record(operation, 'attempted', source);
    const result = fn();
    if (!result.known) throw new Error(operation + ': ' + result.reason);
    if (this.failure) throw new Error(this.failure);
    this.record(operation, 'applied', source);
    return result.value;
  }
  async asyncCall(operation: string, source: string, fn: () => Promise<NativeValue<void>>): Promise<void> {
    if (this.failure) throw new Error(this.failure);
    this.record(operation, 'attempted', source);
    const result = await fn();
    if (!result.known) throw new Error(operation + ': ' + result.reason);
    if (this.failure) throw new Error(this.failure);
    this.record(operation, 'applied', source);
  }
  result(): NativeSessionResult {
    return this.failure ? { supported: false, reason: this.failure, trace: this.rows.slice(), gameplayReady: false }
      : { supported: true, trace: this.rows.slice(), gameplayReady: false };
  }
}

/** Concrete GameApp inherits EditorRunning=false and returns the current
 * session's byte+e8 for GameRunning. These are the same inputs used by routines. */
export class NativeGameApplication<S extends object> {
  pausedByte = 0;
  pauseOverrideByte = 0;
  warmupByte = 0;
  memoryValidationByte = 0;
  frameCounter = 0;
  frameSeconds = 0;
  scaledSeconds = 0;
  /** Session global getter can be replaced by original callbacks. */
  currentSession: { gameRunningByte: number } | null = null;
  /** Shared original global207cca44; seed its actual loader/current value. */
  navigationCompileResult: number;
  private readonly journal = new NativeCallJournal();
  private running = false;
  constructor(private readonly host: NativeApplicationFrameHost<S>, navigationCompileResult: number) {
    this.navigationCompileResult = u32(navigationCompileResult, 'navigation compilation result');
  }
  isEditorRunning(): 0 { return 0; }
  isGameRunning(): number {
    if (this.currentSession === null) return 0;
    const session = this.currentSession; // Original getter is read a second time.
    return byte(session.gameRunningByte, 'session game-running byte');
  }
  /** Direct adapter for NativeRoutineScriptHost; uses this same live session. */
  applicationMode(slot: 0x26c | 0x270): NativeValue<number> {
    if (slot === 0x26c) return { known: true, value: this.isEditorRunning() };
    if (slot === 0x270) return { known: true, value: this.isGameRunning() };
    return { known: false, reason: 'Unexamined application virtual slot' };
  }
  isPaused(_ignoredNativeArgument = false): number {
    return byte(this.pauseOverrideByte, 'pause override') === 1 ? 0 : byte(this.pausedByte, 'paused');
  }
  setPaused(enabled: boolean): void { this.pausedByte = enabled ? 1 : 0; }
  setWarmup(enabled: boolean): void { this.warmupByte = enabled ? 1 : 0; }
  /** GetScaledFrameTime reads a stored float. Original UpdateTick publishes
   * timing at the successful DoRender tail; entity processing uses that latch. */
  spuFrame(): { processingEnabled: boolean; scaledSeconds: number } {
    return { processingEnabled: this.isGameRunning() !== 0,
      scaledSeconds: float32(this.scaledSeconds, 'scaled frame time') };
  }
  trace(): readonly NativeSessionTrace[] { return this.journal.rows.slice(); }
  failure(): string | null { return this.journal.failure; }
  /** Original GameApp virtual+2c0 -> Engine OnRun3006c520. */
  onRun(): NativeSessionResult {
    if (this.running) {
      this.journal.failure = 'Recursive application OnRun is outside the audited profile';
      return this.journal.result();
    }
    this.running = true;
    try {
      const j = this.journal;
      if (j.failure) throw new Error(j.failure);
      if (byte(j.call('outer-panic', 'Engine:3006c550', () => this.host.panicState()), 'panic') !== 1) {
        if (byte(this.memoryValidationByte, 'memory validation') === 1) {
          j.call('validate-memory', 'Engine:3006c56f', () => this.host.validateMemory());
        }
        this.process();
        j.call('render', 'Engine:3006c590/3006c5df', () => this.host.render(true));
      }
    } catch (error) { this.journal.failure = error instanceof Error ? error.message : String(error); }
    finally { this.running = false; }
    return this.journal.result();
  }
  private process(): void {
    const j = this.journal;
    this.frameCounter = (u32(this.frameCounter, 'application frame counter') + 1) >>> 0;
    j.record('frame-counter', 'applied', 'Engine:30067270', this.frameCounter);
    if (byte(j.call('inner-panic', 'Engine:30067270', () => this.host.panicState()), 'panic') === 1) return;
    j.call('keyboard', 'GameApp virtual+2b4', () => this.host.keyboard());
    j.call('mouse', 'GameApp virtual+2b8', () => this.host.mouse());
    j.call('module-process', 'Engine:30067270', () => this.host.moduleProcess());
    j.call('application-on-process', 'GameApp virtual+2c4', () => this.host.onProcess());
    if (j.call('scene-admin-process-test', 'Engine:30067270', () => this.host.sceneAdmin()) !== null) {
      const scene = j.call('scene-admin-process-capture', 'Engine:30067270', () => this.host.sceneAdmin());
      if (scene === null) throw new Error('SceneAdmin disappeared before entity processing');
      j.call('entity-admin-process', 'Engine:30067270', () => this.host.entityAdminProcess(scene));
    }
    j.call('module-post-process', 'Engine:30067270', () => this.host.modulePostProcess());
    j.call('physics-simulate', 'Engine:30067270', () => this.host.physicsSimulate());
    if (j.call('scene-admin-kill-test', 'Engine:30067270', () => this.host.sceneAdmin()) !== null) {
      const scene = j.call('scene-admin-kill-capture', 'Engine:30067270', () => this.host.sceneAdmin());
      if (scene === null) throw new Error('SceneAdmin disappeared before KillEntities');
      j.call('kill-entities', 'Engine:30067270', () => this.host.killEntities(scene));
    }
  }
}

/** Controller fields initialized by20372740. The upper four flag bits are
 * preserved by native Invalidate and must be supplied, not guessed as zero.
 * This represents that subset, not the full reflective session constructor. */
export class NativeSessionRuntime<E extends object, W extends object, G extends object,
  A extends object, P extends object> {
  player: E | null = null;
  camera: E | null = null;
  world: W | null = null;
  gui: G | null = null;
  pointer28: object | null = null;
  pointer2c: object | null = null;
  flags: number;
  cameraIndependentByte = 0;
  gameRunningByte = 0;
  private readonly journal = new NativeCallJournal();
  private starting = false;
  constructor(readonly application: NativeSessionApplication,
    private readonly host: NativeSessionHost<E, W, G, A, P>, previousFlagByte: number) {
    this.flags = byte(previousFlagByte, 'previous session flags') & 0xf0;
  }
  trace(): readonly NativeSessionTrace[] { return this.journal.rows.slice(); }
  failure(): string | null { return this.journal.failure; }
  private apply(fn: () => void): NativeSessionResult {
    try { if (this.journal.failure) throw new Error(this.journal.failure); fn(); }
    catch (error) { this.journal.failure = error instanceof Error ? error.message : String(error); }
    return this.journal.result();
  }
  private entityRequired(entity: E | null, reason: string): E {
    if (entity === null) throw new Error(reason);
    return entity;
  }
  private worldRequired(): W {
    if (this.world === null) throw new Error('World disappeared before captured native call');
    return this.world;
  }
  private guiRequired(): G {
    if (this.gui === null) throw new Error('Native GUI receiver is absent');
    return this.gui;
  }
  private callback(name: NativeSessionCallback): void {
    const j = this.journal;
    const admin = j.call('script-admin-' + name, 'Game:20376690/20374d70/20374e90', () => this.host.scriptAdmin());
    j.call(name, 'ScriptAdmin virtual+bc', () => this.host.script(admin, name, null, null, 0, this));
    // Original ignores the script integer return; host must distinguish a
    // supported native0 from an unknown callback with partially applied effects.
  }
  private clockFromWorld(): NativeSessionClock | null {
    const j = this.journal;
    const test = j.call('world-entity-test', 'Game:200235b0', () => this.host.worldEntity(this.worldRequired()));
    if (test === null) return null;
    const entity = j.call('world-entity-capture', 'Game:200235b0', () => this.host.worldEntity(this.worldRequired()));
    return j.call('clock-property-20', 'Entity virtual+ec selector20', () =>
      this.host.clock(this.entityRequired(entity, 'World entity disappeared before Clock lookup')));
  }
  pause(): NativeSessionResult { return this.apply(() => this.setPause(true)); }
  resume(): NativeSessionResult { return this.apply(() => this.setPause(false)); }
  private setPause(paused: boolean): void {
    const j = this.journal;
    if (((byte(this.flags, 'session flags') & 1) !== 0) === paused) return;
    if (this.world !== null) {
      const test = j.call('pause-world-entity-test', 'Game:20371f00/20371f60', () => this.host.worldEntity(this.worldRequired()));
      if (test !== null) {
        const entity = j.call('pause-world-entity-capture', 'Game:20371f00/20371f60', () => this.host.worldEntity(this.worldRequired()));
        const clock = j.call('pause-clock-20', 'Entity virtual+ec selector20', () =>
          this.host.clock(this.entityRequired(entity, 'Pause world entity disappeared')));
        if (clock === null) throw new Error('Pause/Resume dereferences an absent native Clock_PS');
        j.call(paused ? 'PauseClock' : 'ResumeClock', 'Game:20371f00/20371f60', () => paused ? clock.pause() : clock.resume());
      }
    }
    this.flags = paused ? this.flags | 1 : this.flags & 0xfe;
    j.record('session-paused-flag', 'applied', 'Game:20371f00/20371f60', this.flags);
    this.application.setPaused(paused);
    j.record('application-paused-byte', 'applied', 'Engine:30063570', paused);
  }
  stop(): NativeSessionResult {
    if (this.starting) {
      this.journal.failure = 'Nested Stop during Start is outside the audited profile';
      return this.journal.result();
    }
    return this.apply(() => this.stopBody());
  }
  private restoreThreads(): void {
    const j = this.journal;
    const enabled = byte(j.call('setup-thread-pool-byte', 'SetupEngine+88', () => this.host.setupThreadPoolByte()), 'thread pool setup') !== 0;
    j.call('restore-thread-pool', 'Game:20376690/20374d70', () => this.host.threadPoolEnable(enabled));
  }
  private stopBody(): void {
    const j = this.journal;
    j.call('disable-thread-pool', 'Game:20374d70', () => this.host.threadPoolEnable(false));
    this.pointer28 = null; this.pointer2c = null;
    j.record('clear-pointer28-2c', 'applied', 'Game:20374d70');
    if (this.player !== null || this.camera !== null) {
      if (j.call('current-world', 'Game:20374d70', () => this.host.currentWorld()) === null) {
        throw new Error('Native fatal: cannot clear player/camera without a current world');
      }
      if (this.gui !== null) {
        const gui = this.gui;
        j.call('clear-gui-entities', 'Game:20374d70', () => this.host.clearGuiEntities(gui));
      }
      this.player = null;
      j.record('clear-player', 'applied', 'Game:20374d70');
      this.callback('OnPlayerChanged');
      this.camera = null;
      j.record('clear-camera', 'applied', 'Game:20374d70');
    }
    this.gameRunningByte = 0;
    j.record('game-running', 'applied', 'Game:20374d70', 0);
    this.restoreThreads();
  }
  private selectPlayer(): void {
    const j = this.journal;
    if (this.application.isEditorRunning() === 0 &&
        u32(j.call('count-PC_Hero', 'Game:20374e90', () => this.host.countEntitiesByName('PC_Hero')), 'hero count') > 1) {
      throw new Error('Native fatal: current world has more than one hero');
    }
    const found = j.call('lookup-PC_Hero', 'Game:20374e90', () => this.host.entityByName('PC_Hero'));
    this.player = j.call('cast-PC_Hero-dynamic', 'Game:20374e90', () => this.host.dynamicCast(found));
    j.record('select-player', 'applied', 'Game:20374e90');
    this.callback('OnPlayerChanged');
    if (this.player === null) {
      j.call('missing-player-message', 'Game:20374e90', () => this.host.message(3, "C: can't start game, missing player entity!"));
      return;
    }
    j.call('player-print-debug', 'Game:20374e90', () => this.host.printEntityDebug(this.entityRequired(this.player, 'Player disappeared')));
    j.call('player-deactivation', 'Game:20374e90', () => this.host.enableDeactivation(this.entityRequired(this.player, 'Player disappeared'), false));
    j.call('player-render-alpha', 'Game:20374e90', () => this.host.renderAlpha(this.entityRequired(this.player, 'Player disappeared'), 1, true));
  }
  private selectCamera(): void {
    const j = this.journal;
    if (this.application.isEditorRunning() === 0 &&
        u32(j.call('count-PC_Camera', 'Game:203742a0', () => this.host.countEntitiesByName('PC_Camera')), 'camera count') > 1) {
      throw new Error('Native fatal: current world has more than one camera');
    }
    const found = j.call('lookup-PC_Camera', 'Game:203742a0', () => this.host.entityByName('PC_Camera'));
    this.camera = j.call('cast-PC_Camera-dynamic', 'Game:203742a0', () => this.host.dynamicCast(found));
    j.record('select-camera', 'applied', 'Game:203742a0');
    if (this.camera === null) {
      j.call('no-camera-message', 'Game:203742a0', () => this.host.message(3, ' current world has no camera! '));
    }
    if (this.camera === null) {
      j.call('missing-camera-message', 'Game:203742a0', () => this.host.message(3, "C: can't start game, missing camera entity!"));
      return;
    }
    j.call('camera-deactivation', 'Game:203742a0', () => this.host.enableDeactivation(this.entityRequired(this.camera, 'Camera disappeared'), false));
    j.call('camera-cache-in', 'Game:203742a0', () => this.host.cacheIn(this.entityRequired(this.camera, 'Camera disappeared'), false));
    if (this.camera !== null) {
      const camera = this.camera;
      const object = j.call('camera-property-wrapper-18', 'Game:203743d4-203743e1', () => this.host.cameraObject(camera));
      if (object !== null) {
        const player = byte(this.cameraIndependentByte, 'camera independent') === 0 ? this.player : null;
        j.call('camera-bind-player', 'Camera virtual+150', () => object.bindPlayer(player));
        if (j.call('camera-property-object-test', 'Game:20374413', () => object.propertyObject()) !== null) {
          const captured = j.call('camera-property-object-capture', 'Game:2037441b', () => object.propertyObject());
          if (captured === null) throw new Error('Camera property object disappeared before virtual34');
          j.call('camera-property-object-virtual34', 'Game:20374424', () => object.propertyObjectVirtual34(captured));
        }
      }
    }
  }
  private mute(enabled: boolean): void {
    const j = this.journal;
    if (j.call('channel0-test', 'Game:20376690', () => this.host.channel0()) !== null) {
      const channel = j.call('channel0-capture', 'Game:20376690', () => this.host.channel0());
      if (channel === null) throw new Error('Audio channel0 disappeared before OverrideMute');
      j.call('override-mute', 'Game:20376690', () => this.host.overrideMute(channel, enabled));
    }
  }
  async start(mode: number): Promise<NativeSessionResult> {
    if (this.starting) {
      this.journal.failure = 'Recursive Start is outside the audited profile';
      return this.journal.result();
    }
    this.starting = true;
    try {
      const j = this.journal;
      if (j.failure) throw new Error(j.failure);
      // Enum is signed native32. Modes other than0/1/2 retain original branches.
      i32(mode, 'Start mode');
      if (mode !== 2 && this.player !== null) this.stopBody();
      if (this.world !== null) {
        if (this.player === null) this.selectPlayer();
        if (this.camera === null) this.selectCamera();
        if (mode !== 2) {
          j.call('script-admin-before-compile', 'Game:203766e3', () => this.host.scriptAdmin());
          const admin = j.call('navigation-admin-before-compile', 'Game:203766fe', () => this.host.navigationAdmin(0));
          this.application.navigationCompileResult = u32(j.call('compile-navigation', 'Game:20376690', () =>
            this.host.compileNavigation(admin, mode === 1, '')), 'compile result');
        }
        this.gameRunningByte = this.application.navigationCompileResult === 1 ? 1 : 0;
        j.record('game-running', 'applied', 'Game:20376690', this.gameRunningByte);
        if (mode === 0 || mode === 1) this.callback('OnInit');
        if (mode === 0) this.callback('OnGameStartUp');
        const clock = this.clockFromWorld();
        if (clock !== null) {
          const time = j.call('command-line-time', 'Game:20376690', () => this.host.commandLineTime());
          if (time !== null) j.call('set-hour', 'Game:2002b094', () => clock.setHour(i32(time, 'command-line hour') >>> 0));
          j.call('set-factor', 'Game:2002bfdf', () => clock.setFactor(12));
          j.call('resume-clock-start', 'Game:2001c409', () => clock.resume());
        }
        this.setPause(false);
        if (mode === 0) {
          j.call('disable-engine-component', 'Game:20376690', () => this.host.engineComponentEnable(false));
          this.mute(true);
        }
        this.application.setWarmup(true);
        j.record('warmup-byte', 'applied', 'Engine:3005f420', true);
        for (let iteration = 0; iteration < 20; iteration++) {
          j.record('warmup-frame', 'attempted', 'GameApp virtual+2c0', iteration);
          const frame = this.application.onRun();
          if (!frame.supported) throw new Error('Warmup frame' + iteration + ': ' + frame.reason);
          j.record('warmup-frame', 'applied', 'GameApp virtual+2c0', iteration);
          await j.asyncCall('sleep-100ms', 'Win32 Sleep after each warmup frame', () => this.host.sleep(100));
        }
        this.application.setWarmup(false);
        j.record('warmup-byte', 'applied', 'Engine:3005f420', false);
        j.call('close-menu', 'Game:20021607', () => this.host.closeMenu(this.guiRequired()));
        j.call('close-page', 'Game:20021ca1', () => this.host.closePage(this.guiRequired()));
        this.callback('OnReturnFromMenu');
        if (mode === 0) {
          await j.asyncCall('intro-video', 'Game:20376690', () => this.host.playVideo('G3_Intro.bik'));
          j.call('enable-engine-component', 'Game:20376690', () => this.host.engineComponentEnable(true));
          this.mute(false);
        }
        if (this.player !== null) {
          const player = this.player;
          const memory = j.call('player-memory-3c', 'Entity virtual+ec selector3c', () => this.host.playerMemory(player));
          if (memory !== null && byte(j.call('tutorial-enabled-1', 'Game:2000551f', () => memory.isTutorialEnabled(1)), 'tutorial result') !== 0) {
            j.call('disable-tutorial-1', 'Game:200061c7', () => memory.enableTutorial(1, false));
            const localized = j.call('localize-TUT_Start', 'Game:20376690', () => this.host.localizeStartTutorial('TUT_Start'));
            j.call('open-tutorial', 'Game:2002a07c', () => this.host.openTutorial(this.guiRequired(), localized));
          }
        }
      }
      this.restoreThreads(); // Also called on the original world-absent path.
    } catch (error) { this.journal.failure = error instanceof Error ? error.message : String(error); }
    finally { this.starting = false; }
    return this.journal.result();
  }
}
