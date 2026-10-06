/** Known preparation stages, rather than a guessed estimate of download bytes or elapsed time. */
export const LOADING_PHASES = ['prepare', 'residents', 'models', 'textures', 'terrain', 'woodland', 'settlement', 'physics', 'navigation', 'graphics'] as const;
export type LoadingPhase = typeof LOADING_PHASES[number];

export interface LoadingUpdate {
  phase: LoadingPhase;
  /** Completed assets or work units in this phase; omit both counts for an unknown-size operation. */
  completed?: number;
  total?: number;
  /** Optional player-facing description of the current operation. */
  detail?: string;
}

export interface LoadingSnapshot {
  phase: LoadingPhase;
  index: number;
  completed: number | null;
  total: number | null;
  /** Only the active stage has a measured fraction. Completed stages retain their filled segments. */
  fraction: number | null;
  detail: string | null;
}

/** Ignore late callbacks from an earlier stage and out-of-order counts from the current stage. */
export class LoadingProgress {
  readonly phases: readonly LoadingPhase[];
  private current: LoadingSnapshot;

  constructor(phases: readonly LoadingPhase[] = LOADING_PHASES) {
    if (!phases.length || new Set(phases).size !== phases.length) throw new Error('Loading stages must be unique and nonempty.');
    this.phases = [...phases];
    this.current = this.initial();
  }

  reset(phase: LoadingPhase = this.phases[0]!) {
    this.current = this.initial(phase);
    return this.snapshot;
  }

  update(update: LoadingUpdate): LoadingSnapshot {
    const index = this.phases.indexOf(update.phase);
    if (index < this.current.index) return this.snapshot;
    if (index < 0) return this.snapshot;
    const total = Number.isFinite(update.total) && update.total! >= 1 ? Math.floor(update.total!) : null;
    const completed = total !== null && Number.isFinite(update.completed) && update.completed! >= 0
      ? Math.min(total, Math.floor(update.completed!)) : null;
    if (index === this.current.index && total === this.current.total && completed !== null &&
      this.current.completed !== null && completed < this.current.completed) return this.snapshot;
    const measured = completed !== null && total !== null ? completed / total : null;
    // A newly discovered work count must not pull an already drawn stage backwards.
    const fraction = measured !== null && index === this.current.index && this.current.fraction !== null
      ? Math.max(measured, this.current.fraction) : measured;
    this.current = {
      phase: update.phase, index, completed, total, fraction, detail: update.detail?.trim() || null,
    };
    return this.snapshot;
  }

  get snapshot(): LoadingSnapshot { return { ...this.current }; }

  private initial(phase: LoadingPhase = this.phases[0]!): LoadingSnapshot {
    const index = this.phases.indexOf(phase);
    if (index < 0) throw new Error(`Unknown loading stage: ${phase}`);
    return { phase, index, completed: null, total: null, fraction: null, detail: null };
  }
}
