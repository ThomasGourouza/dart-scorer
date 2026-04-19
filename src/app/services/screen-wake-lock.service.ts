import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';

type WakeLockApi = {
  request: (type: 'screen') => Promise<WakeLockSentinel>;
};

/**
 * Keeps the device screen awake while the app is open (Screen Wake Lock API).
 * Re-requests when the tab becomes visible again; retries on first tap/touch
 * (needed on some mobile browsers after user gesture).
 */
@Injectable({ providedIn: 'root' })
export class ScreenWakeLockService {
  private readonly platformId = inject(PLATFORM_ID);
  private lock: WakeLockSentinel | null = null;
  private managing = false;

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.requestLock();
    }
  };

  private readonly onFirstInteract = (): void => {
    void this.requestLock();
  };

  /** Start listening for visibility + one user interaction; call once from app shell. */
  startManaging(): void {
    if (!isPlatformBrowser(this.platformId) || this.managing) return;
    this.managing = true;
    void this.requestLock();
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('click', this.onFirstInteract, { capture: true, passive: true, once: true });
    document.addEventListener('touchstart', this.onFirstInteract, { capture: true, passive: true, once: true });
  }

  stopManaging(): void {
    if (!isPlatformBrowser(this.platformId) || !this.managing) return;
    this.managing = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.releaseLock();
  }

  private async requestLock(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const nav = navigator as Navigator & { wakeLock?: WakeLockApi };
    if (!nav.wakeLock?.request) return;
    if (document.visibilityState !== 'visible') return;
    if (this.lock) return;
    try {
      this.lock = await nav.wakeLock.request('screen');
      this.lock.addEventListener('release', () => {
        this.lock = null;
      });
    } catch {
      /* not allowed or unsupported context */
    }
  }

  private async releaseLock(): Promise<void> {
    if (!this.lock) return;
    try {
      await this.lock.release();
    } catch {
      /* ignore */
    }
    this.lock = null;
  }
}
