import type { VaultAutoLockSeconds } from './types';

export class VaultAutoLock {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  constructor(private seconds: VaultAutoLockSeconds, private readonly onLock: () => void) {}

  unlock(): void { this.active = true; this.touch(); }
  touch(): void {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.lock(), this.seconds * 1000);
  }
  setSeconds(seconds: VaultAutoLockSeconds): void { this.seconds = seconds; this.touch(); }
  lock(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.active) return;
    this.active = false;
    this.onLock();
  }
  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.active = false;
  }
}
