export class PerformanceProfiler {
  private static marks: Record<string, number> = {};
  private static metrics: Record<string, number[]> = {};

  /**
   * Start a performance measurement mark
   */
  static start(markName: string): void {
    this.marks[markName] = Date.now();
  }

  /**
   * End a performance measurement and log the duration
   */
  static end(markName: string, category: string = 'General'): number {
    const startTime = this.marks[markName];
    if (!startTime) {
      return 0;
    }
    const duration = Date.now() - startTime;
    delete this.marks[markName];

    if (!this.metrics[markName]) {
      this.metrics[markName] = [];
    }
    this.metrics[markName].push(duration);

    // Keep history bounded to avoid memory growth
    if (this.metrics[markName].length > 100) {
      this.metrics[markName].shift();
    }

    console.log(`[PerfProfiler] [${category}] ${markName} took ${duration}ms`);
    return duration;
  }

  /**
   * Get average duration of a specific mark
   */
  static getAverage(markName: string): number {
    const list = this.metrics[markName];
    if (!list || list.length === 0) return 0;
    const sum = list.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / list.length);
  }

  /**
   * Log render metrics for optimization tracking
   */
  static logRender(componentName: string, additionalInfo: string = ''): void {
    console.log(`[PerfProfiler] [Render] <${componentName} /> rendered. ${additionalInfo}`);
  }
}
