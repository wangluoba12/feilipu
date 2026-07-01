import cron from 'node-cron';
import { log } from './logger';
import type { CronJobConfig } from '../types/config';

interface CronJobEntry {
  config: CronJobConfig;
  task: cron.ScheduledTask;
}

export class CronScheduler {
  private jobs: Map<string, CronJobEntry> = new Map();
  private taskExecutor: Record<string, (job: CronJobConfig) => Promise<void>> = {};

  registerActionType(type: string, executor: (job: CronJobConfig) => Promise<void>): void {
    this.taskExecutor[type] = executor;
  }

  loadJobs(jobs: CronJobConfig[]): void {
    for (const job of jobs) {
      if (job.enabled) {
        this.addJobFromConfig(job);
      }
    }
    log.info(`CronScheduler loaded ${this.jobs.size} jobs`);
  }

  addJobFromConfig(config: CronJobConfig): void {
    if (!cron.validate(config.cron)) {
      log.warn(`Invalid cron expression for job: ${config.name}`, { cron: config.cron });
      return;
    }

    const task = cron.schedule(config.cron, async () => {
      await this.executeJob(config);
    });

    this.jobs.set(config.id, { config, task });
    log.info(`Cron job scheduled: ${config.name} (${config.cron})`);
  }

  removeJob(id: string): void {
    const entry = this.jobs.get(id);
    if (entry) {
      entry.task.stop();
      this.jobs.delete(id);
      log.info(`Cron job removed: ${entry.config.name}`);
    }
  }

  listJobs(): { config: CronJobConfig; running: boolean }[] {
    const result: { config: CronJobConfig; running: boolean }[] = [];
    for (const entry of this.jobs.values()) {
      result.push({
        config: entry.config,
        running: true,
      });
    }
    return result;
  }

  async triggerJob(id: string): Promise<void> {
    const entry = this.jobs.get(id);
    if (entry) {
      log.info(`Manually triggering job: ${entry.config.name}`);
      await this.executeJob(entry.config);
    } else {
      log.warn(`Job not found for trigger: ${id}`);
    }
  }

  stopAll(): void {
    for (const entry of this.jobs.values()) {
      entry.task.stop();
    }
    this.jobs.clear();
    log.info('All cron jobs stopped');
  }

  private async executeJob(config: CronJobConfig): Promise<void> {
    try {
      const executor = this.taskExecutor[config.action.type];
      if (executor) {
        await executor(config);
      } else {
        log.warn(`No executor for action type: ${config.action.type}`);
      }
    } catch (err) {
      log.error(`Cron job execution failed: ${config.name}`, { error: String(err) });
    }
  }
}
