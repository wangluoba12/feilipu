declare module 'node-cron' {
  namespace cron {
    interface ScheduledTask {
      start: () => void;
      stop: () => void;
      destroy: () => void;
      getStatus: () => string;
    }

    interface ScheduleOptions {
      scheduled?: boolean;
      timezone?: string;
    }

    function schedule(
      expression: string,
      func: ((now: Date | 'manual' | 'init') => void) | string,
      options?: ScheduleOptions
    ): ScheduledTask;

    function validate(expression: string): boolean;
  }

  export = cron;
}
