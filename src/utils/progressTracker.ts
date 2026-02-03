type ProgressSnapshot = {
  completed: number;
  failed: number;
  total: number;
  elapsedMs: number;
};

type ProgressListener = (state: ProgressSnapshot) => void;

export class ProgressTracker {
  private completed = 0;
  private failed = 0;
  private startTime = Date.now();
  private listeners = new Set<ProgressListener>();

  constructor(private total: number) {}

  subscribe(listener: ProgressListener) {
    this.listeners.add(listener);
    this.emit();
    return () => this.listeners.delete(listener);
  }

  success() {
    this.completed++;
    this.emit();
  }

  failure() {
    this.failed++;
    this.emit();
  }

  private emit() {
    const snapshot: ProgressSnapshot = {
      completed: this.completed,
      failed: this.failed,
      total: this.total,
      elapsedMs: Date.now() - this.startTime,
    };

    this.listeners.forEach(fn => fn(snapshot));
  }
}
