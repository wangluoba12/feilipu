export interface AdRule {
  id: string;
  name: string;
  type: 'keyword' | 'regex';
  pattern: string;
  enabled: boolean;
}

export interface StatusSchedule {
  from: string;
  to: string;
  status: number;
  ext_status: number;
}

export interface CronJobConfig {
  id: string;
  name: string;
  cron: string;
  action: CronAction;
  enabled: boolean;
}

export type CronAction =
  | { type: 'send_message'; group_id: string; message: string }
  | { type: 'group_sign'; group_id: string }
  | { type: 'avatar_rotate' }
  | { type: 'signature_update' }
  | { type: 'status_change'; status: number; ext_status: number }
  | { type: 'notification'; group_id: string; message: string };

export interface TitleMapping {
  points: number;
  title: string;
}

export interface BotConfig {
  name: string;
  admins: string[];
  commandPrefix: string;
}

export interface GroupManagementConfig {
  enabled: boolean;
  blacklist: {
    global: string[];
    groups: Record<string, string[]>;
  };
  whitelist: Record<string, string[]>;
  mute: {
    escalate: boolean;
    thresholds: [number, number, number];
    defaultDuration: number;
  };
  adDetect: {
    enabled: boolean;
    rules: AdRule[];
    action: 'warn' | 'mute' | 'kick' | 'recall';
  };
  floodDetect: {
    enabled: boolean;
    windowSeconds: number;
    maxMessages: number;
    action: 'warn' | 'mute';
  };
  captcha: {
    enabled: boolean;
    timeoutSeconds: number;
  };
  audit: {
    enabled: boolean;
    autoRejectLevel: number;
  };
}

export interface PointsConfig {
  enabled: boolean;
  perMessage: number;
  maxPerMinute: number;
  dailyCheckin: number;
  streakBonus: number[];
}

export interface SocialConfig {
  poke: { cooldown: number; enabled: boolean };
  lottery: { enabled: boolean };
  qa: { enabled: boolean; triggerMode: 'command' | 'keyword' | 'both' };
  aiVoice: { enabled: boolean; cooldown: number; defaultCharacter: string };
}

export interface AutomationConfig {
  cronJobs: CronJobConfig[];
  autoSign: { enabled: boolean; groups: string[]; cron: string };
  autoRead: { enabled: boolean; whitelist: string[] };
  autoFileDownload: { enabled: boolean; directory: string; filters: string[] };
}

export interface AccountConfig {
  avatarRotation: { enabled: boolean; cron: string; avatars: string[] };
  dynamicSignature: { enabled: boolean; cron: string; templates: string[] };
  onlineStatus: { enabled: boolean; schedule: StatusSchedule[] };
}

export interface OperationsConfig {
  referral: {
    enabled: boolean;
    targets: ReferralTarget[];
  };
  welcome: {
    enabled: boolean;
    template: string;
  };
}

export interface ReferralTarget {
  groupId: string;
  name: string;
  bonus: number;
}

export interface WebUIConfig {
  port: number;
  host: string;
}

export interface AppConfig {
  bot: BotConfig;
  groupManagement: GroupManagementConfig;
  points: PointsConfig;
  social: SocialConfig;
  message: { archiveRetentionDays: number };
  automation: AutomationConfig;
  account: AccountConfig;
  operations: OperationsConfig;
  webui: WebUIConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  bot: {
    name: '群管机器人',
    admins: [],
    commandPrefix: '/',
  },
  groupManagement: {
    enabled: true,
    blacklist: { global: [], groups: {} },
    whitelist: {},
    mute: {
      escalate: true,
      thresholds: [3, 60, -1],
      defaultDuration: 10,
    },
    adDetect: {
      enabled: true,
      rules: [],
      action: 'recall',
    },
    floodDetect: {
      enabled: true,
      windowSeconds: 5,
      maxMessages: 5,
      action: 'mute',
    },
    captcha: {
      enabled: false,
      timeoutSeconds: 120,
    },
    audit: {
      enabled: false,
      autoRejectLevel: 5,
    },
  },
  points: {
    enabled: true,
    perMessage: 1,
    maxPerMinute: 10,
    dailyCheckin: 10,
    streakBonus: [0, 5, 10, 15, 20, 25, 30],
  },
  social: {
    poke: { cooldown: 30, enabled: true },
    lottery: { enabled: true },
    qa: { enabled: true, triggerMode: 'both' },
    aiVoice: { enabled: true, cooldown: 60, defaultCharacter: '' },
  },
  message: { archiveRetentionDays: 7 },
  automation: {
    cronJobs: [],
    autoSign: { enabled: false, groups: [], cron: '0 8 * * *' },
    autoRead: { enabled: true, whitelist: [] },
    autoFileDownload: { enabled: false, directory: './data/files', filters: [] },
  },
  account: {
    avatarRotation: { enabled: false, cron: '0 0 * * *', avatars: [] },
    dynamicSignature: { enabled: false, cron: '0 * * * *', templates: [] },
    onlineStatus: { enabled: false, schedule: [] },
  },
  operations: {
    referral: { enabled: false, targets: [] },
    welcome: { enabled: true, template: '欢迎 {user} 加入 {group} 群！' },
  },
  webui: {
    port: 9090,
    host: '0.0.0.0',
  },
};
