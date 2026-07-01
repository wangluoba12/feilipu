import type { PointsCore, PointsRecord } from './points-core';
import { type MessageSegment } from '../../types/events';
import { log } from '../../infra/logger';

export class CheckinManager {
  private pointsCore: PointsCore;

  constructor(pointsCore: PointsCore) {
    this.pointsCore = pointsCore;
  }

  async doCheckin(
    userId: number | string,
    groupId: number | string,
    dailyCheckin: number,
    streakBonus: number[]
  ): Promise<{ record: PointsRecord; message: string }> {
    const today = this.getToday();
    const record = await this.pointsCore.getRecord(userId, groupId);

    if (record.lastCheckinDate === today) {
      return { record, message: '今天已签到过了' };
    }

    const yesterday = this.getYesterday();
    let streak = record.checkinStreak;

    if (record.lastCheckinDate === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }

    const bonusIndex = Math.min(streak, streakBonus.length) - 1;
    const bonus = streakBonus[bonusIndex] || 0;
    const totalReward = dailyCheckin + bonus;

    const updated = await this.pointsCore.addPoints(userId, groupId, totalReward, 999999);

    const key = this.pointsCore.getRecordKey(userId, groupId);
    const data = await (this.pointsCore as unknown as { storage: { read: () => Promise<{ records: Record<string, PointsRecord> }> } }).storage.read();
    data.records[key].checkinStreak = streak;
    data.records[key].lastCheckinDate = today;
    await (this.pointsCore as unknown as { storage: { write: (d: unknown) => Promise<void> } }).storage.write(data);

    let msg = `签到成功！获得 ${dailyCheckin} 积分`;
    if (bonus > 0) msg += `，连续签到第 ${streak} 天额外奖励 ${bonus} 积分`;
    msg += `，当前积分：${(await this.pointsCore.getRecord(userId, groupId)).points}`;

    return { record: updated, message: msg };
  }

  private getToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getYesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
