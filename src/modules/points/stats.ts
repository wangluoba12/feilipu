import { JsonStorage } from '../../infra/storage';
import type { GroupMessageEvent } from '../../types/events';

export interface MessageStat {
  groupId: string;
  userId: string;
  date: string;
  count: number;
}

export interface StatsData {
  stats: Record<string, MessageStat>;
}

export class StatsManager {
  private storage: JsonStorage<StatsData>;

  constructor(dataDir: string) {
    this.storage = new JsonStorage<StatsData>(`${dataDir}/msg_stats.json`, { stats: {} });
  }

  async init(): Promise<void> {
    await this.storage.read();
  }

  async recordMessage(event: GroupMessageEvent): Promise<void> {
    const today = this.getToday();
    const key = `${event.group_id}_${event.user_id}_${today}`;

    const data = await this.storage.read();
    const existing = data.stats[key];
    if (existing) {
      existing.count += 1;
    } else {
      data.stats[key] = {
        groupId: String(event.group_id),
        userId: String(event.user_id),
        date: today,
        count: 1,
      };
    }
    await this.storage.write(data);
  }

  async getGroupStats(groupId: number | string, period: 'day' | 'week' | 'month'): Promise<{ userId: string; count: number }[]> {
    const data = await this.storage.read();
    const today = new Date();

    let daysToInclude = 1;
    if (period === 'week') daysToInclude = 7;
    if (period === 'month') daysToInclude = 30;

    const validDates = new Set<string>();
    for (let i = 0; i < daysToInclude; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      validDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    const userCounts: Map<string, number> = new Map();
    for (const stat of Object.values(data.stats)) {
      if (stat.groupId === String(groupId) && validDates.has(stat.date)) {
        const current = userCounts.get(stat.userId) || 0;
        userCounts.set(stat.userId, current + stat.count);
      }
    }

    return Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getGlobalStats(groupId: number | string, period: 'day' | 'week' | 'month'): Promise<{ userId: string; count: number }[]> {
    return this.getGroupStats(groupId, period);
  }

  private getToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
