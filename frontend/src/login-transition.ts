import type { Status } from './state';

export const ENTRY_HOLD = .2;
export const ENTRY_ZOOM = 1.8;
export const ENTRY_DURATION = ENTRY_HOLD + ENTRY_ZOOM;
export const SCREEN_WIDTH = 1.235;
export const SCREEN_HEIGHT = 2.79;
export const SCREEN_Z = .1005;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => value * value * value * (value * (value * 6 - 15) + 10);

export function entryFrame(elapsed: number, reduced = false) {
  const progress = reduced ? 1 : clamp((elapsed - ENTRY_HOLD) / ENTRY_ZOOM);
  return {
    zoom: smooth(progress),
    detailsOpacity: 1 - smooth(clamp((progress - .08) / .56)),
    wallpaperMix: smooth(clamp(progress / .88)),
    complete: progress >= 1,
  };
}

/** Bring every edge of the screen beyond the viewport, including on resize. */
export function screenCoverDistance(aspect: number, fov: number) {
  const tangent = Math.tan(fov * Math.PI / 360);
  return SCREEN_Z + .82 * Math.min(SCREEN_WIDTH / (2 * tangent * aspect), SCREEN_HEIGHT / (2 * tangent));
}

interface TransitionEffects {
  enter: (complete: () => void) => void;
  reveal: () => void;
  reset: () => void;
}

/** One transition per successful pairing; repeated polling cannot replay it. */
export class LoginTransition {
  phase: 'pairing' | 'entering' | 'home' = 'pairing';
  private generation = 0;
  private effects: TransitionEffects;

  constructor(effects: TransitionEffects) { this.effects = effects; }

  open(): void {
    if (this.phase !== 'pairing') return;
    this.phase = 'entering';
    const generation = ++this.generation;
    this.effects.enter(() => {
      if (generation !== this.generation || this.phase !== 'entering') return;
      this.phase = 'home';
      this.effects.reveal();
    });
  }

  accept(status: Status): boolean {
    if (status === 'paired' || status === 'connected') {
      this.open();
      return true;
    }
    this.reset();
    return false;
  }

  reset(): void {
    if (this.phase === 'pairing') return;
    ++this.generation;
    this.phase = 'pairing';
    this.effects.reset();
  }
}
