import type { GroupMessageEvent } from '../../types/events';
import { JsonStorage } from '../../infra/storage';

export interface PointsRecord {
  userId: string;
  groupId: string;
  points: number;
  checkinStreak: number;
  lastCheckinDate: string;
  totalPoints: number;
}

export interface PointsData {
  records: Record<string, PointsRecord>;
}

export class PointsCore {
  private storage: JsonStorage<PointsData>;
  private minuteCounters: Map<string, number> = new Map();

  constructor(dataDir: string) {
    this.storage = new JsonStorage<PointsData>(`${dataDir}/points.json`, { records: {} });
  }

  async init(): Promise<void> {
    await this.storage.read();
    this.resetMinuteCounters();
    setInterval(() => this.resetMinuteCounters(), 60000);
  }

  private resetMinuteCounters(): void {
    this.minuteCounters.clear();
  }

  getRecordKey(userId: number | string, groupId: number | string): string {
    return `${groupId}_${userId}`;
  }

  async getRecord(userId: number | string, groupId: number | string): Promise<PointsRecord> {
    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    return data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: '',
      totalPoints: 0,
    };
  }

  async addPoints(
    userId: number | string,
    groupId: number | string,
    amount: number,
    perMinuteMax: number
  ): Promise<PointsRecord> {
    const counterKey = this.getRecordKey(userId, groupId);
    const current = this.minuteCounters.get(counterKey) || 0;
    if (perMinuteMax > 0 && current >= perMinuteMax) {
      return this.getRecord(userId, groupId);
    }

    this.minuteCounters.set(counterKey, current + amount);

    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    const record = data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: '',
      totalPoints: 0,
    };

    record.points += amount;
    record.totalPoints += amount;
    data.records[key] = record;

    await this.storage.write(data);
    return record;
  }

  async setPoints(userId: number | string, groupId: number | string, points: number): Promise<PointsRecord> {
    const key = this.getRecordKey(userId, groupId);
    const data = await this.storage.read();
    const record = data.records[key] || {
      userId: String(userId),
      groupId: String(groupId),
      points: 0,
      checkinStreak: 0,
      lastCheckinDate: '',
      totalPoints: 0,
    };

    const diff = points - record.points;
    record.points = points;
    if (diff > 0) record.totalPoints += diff;
    data.records[key] = record;

    await this.storage.write(data);
    return record;
  }

  async getRanking(groupId: number | string, limit: number = 10): Promise<PointsRecord[]> {
    const data = await this.storage.read();
    const groupPrefix = `${groupId}_`;
    const records = Object.values(data.records)
      .filter((r) => r.groupId === String(groupId))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
    return records;
  }
}
