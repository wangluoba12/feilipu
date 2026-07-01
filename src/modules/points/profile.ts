import { JsonStorage } from '../../infra/storage';
import type { PointsCore, PointsRecord } from './points-core';

export interface UserProfile {
  userId: string;
  nickname: string;
  bio: string;
  customFields: Record<string, string>;
}

export interface ProfileData {
  profiles: Record<string, UserProfile>;
}

export class ProfileManager {
  private storage: JsonStorage<ProfileData>;
  private pointsCore: PointsCore;

  constructor(dataDir: string, pointsCore: PointsCore) {
    this.storage = new JsonStorage<ProfileData>(`${dataDir}/profile.json`, { profiles: {} });
    this.pointsCore = pointsCore;
  }

  async getProfile(userId: string, groupId: string): Promise<{ profile: UserProfile; points: PointsRecord }> {
    const data = await this.storage.read();
    const profile = data.profiles[userId] || {
      userId,
      nickname: '',
      bio: '',
      customFields: {},
    };
    const points = await this.pointsCore.getRecord(userId, groupId);
    return { profile, points };
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const data = await this.storage.read();
    const existing = data.profiles[userId] || {
      userId,
      nickname: '',
      bio: '',
      customFields: {},
    };
    const updated = { ...existing, ...updates, userId };
    data.profiles[userId] = updated;
    await this.storage.write(data);
    return updated;
  }
}
