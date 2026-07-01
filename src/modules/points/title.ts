import type { ConfigManager } from '../../infra/config';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { PointsCore } from './points-core';
import type { AppConfig, TitleMapping } from '../../types/config';

export class TitleManager {
  private api: ApiWrapper;
  private config: ConfigManager;
  private pointsCore: PointsCore;

  constructor(api: ApiWrapper, config: ConfigManager, pointsCore: PointsCore) {
    this.api = api;
    this.config = config;
    this.pointsCore = pointsCore;
  }

  async setTitle(groupId: number, userId: number, title: string): Promise<void> {
    await this.api.setGroupSpecialTitle(groupId, userId, title);
  }

  async checkAndUpdateTitle(userId: number, groupId: number): Promise<string | null> {
    const titleMappings = this.config.get<TitleMapping[]>('points.titleMappings') || [];
    const record = await this.pointsCore.getRecord(userId, groupId);

    let matchedTitle: string | null = null;
    for (const mapping of titleMappings.sort((a, b) => b.points - a.points)) {
      if (record.totalPoints >= mapping.points) {
        matchedTitle = mapping.title;
        break;
      }
    }

    if (matchedTitle) {
      await this.api.setGroupSpecialTitle(groupId, userId, matchedTitle);
    }

    return matchedTitle;
  }
}
