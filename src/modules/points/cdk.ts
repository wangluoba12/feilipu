import { JsonStorage } from '../../infra/storage';
import { log } from '../../infra/logger';
import type { PointsCore } from './points-core';
import { randomBytes } from 'node:crypto';

export interface CdkEntry {
  code: string;
  batchId: string;
  amount: number;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  expireAt: string;
}

export interface CdkBatch {
  id: string;
  name: string;
  amount: number;
  count: number;
  usedCount: number;
  expireAt: string;
  createdAt: string;
}

export interface CdkData {
  entries: Record<string, CdkEntry>;
  batches: CdkBatch[];
}

export class CdkManager {
  private storage: JsonStorage<CdkData>;
  private pointsCore: PointsCore;

  constructor(dataDir: string, pointsCore: PointsCore) {
    this.storage = new JsonStorage<CdkData>(`${dataDir}/cdk.json`, {
      entries: {},
      batches: [],
    });
    this.pointsCore = pointsCore;
  }

  async init(): Promise<void> {
    await this.storage.read();
  }

  async createBatch(name: string, amount: number, count: number, expireAt: string): Promise<CdkBatch> {
    const batchId = randomBytes(4).toString('hex');
    const batch: CdkBatch = {
      id: batchId,
      name,
      amount,
      count,
      usedCount: 0,
      expireAt,
      createdAt: new Date().toISOString(),
    };

    const data = await this.storage.read();
    data.batches.push(batch);

    for (let i = 0; i < count; i++) {
      const code = this.generateCode();
      data.entries[code] = {
        code,
        batchId,
        amount,
        used: false,
        expireAt,
      };
    }

    await this.storage.write(data);
    log.info(`CDK batch created: ${name} (${count} codes)`);
    return batch;
  }

  async redeem(code: string, userId: string, groupId: string): Promise<{ success: boolean; message: string; amount: number }> {
    const data = await this.storage.read();
    const entry = data.entries[code];

    if (!entry) {
      return { success: false, message: 'CDK 无效', amount: 0 };
    }

    if (entry.used) {
      return { success: false, message: 'CDK 已被使用', amount: 0 };
    }

    if (new Date(entry.expireAt) < new Date()) {
      return { success: false, message: 'CDK 已过期', amount: 0 };
    }

    entry.used = true;
    entry.usedBy = userId;
    entry.usedAt = new Date().toISOString();

    const batch = data.batches.find((b) => b.id === entry.batchId);
    if (batch) batch.usedCount += 1;

    await this.storage.write(data);

    await this.pointsCore.addPoints(userId, groupId, entry.amount, 999999);

    return { success: true, message: `兑换成功，获得 ${entry.amount} 积分`, amount: entry.amount };
  }

  async getBatches(): Promise<CdkBatch[]> {
    const data = await this.storage.read();
    return data.batches;
  }

  async getUnusedCodes(batchId: string): Promise<CdkEntry[]> {
    const data = await this.storage.read();
    return Object.values(data.entries).filter((e) => e.batchId === batchId && !e.used);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return code;
  }
}
