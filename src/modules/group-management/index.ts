import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { AppConfig } from '../../types/config';
import type { GroupMessageEvent, GroupIncreaseEvent } from '../../types/events';
import { JsonStorage } from '../../infra/storage';
import { log } from '../../infra/logger';
import { randomBytes } from 'node:crypto';

interface BlacklistData {
  entries: { userId: string; groupId: string; reason: string; operatorId: string; createdAt: string }[];
}
interface MuteLogData {
  logs: { userId: string; groupId: string; operatorId: string; duration: number; reason: string; timestamp: string }[];
}
interface RecallLogData {
  logs: { groupId: string; operatorId: string; targetId: string; count: number; timestamp: string }[];
}
interface CaptchaSession {
  groupId: number;
  userId: number;
  answer: number;
  expiresAt: number;
}

export function createGroupManagementModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  dataDir: string
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;
  const blacklistStore = new JsonStorage<BlacklistData>(`${dataDir}/blacklist.json`, { entries: [] });
  const muteLogStore = new JsonStorage<MuteLogData>(`${dataDir}/mute_log.json`, { logs: [] });
  const recallLogStore = new JsonStorage<RecallLogData>(`${dataDir}/recall_log.json`, { logs: [] });

  const floodCounters = new Map<string, { count: number; firstTime: number; lastContent: string }>();
  const captchaSessions = new Map<string, CaptchaSession>();
  const muteHistory = new Map<string, number>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, counter] of floodCounters) {
      if (now - counter.firstTime > config.get<AppConfig['groupManagement']>('groupManagement').floodDetect.windowSeconds * 1000) {
        floodCounters.delete(key);
      }
    }
    for (const [key, session] of captchaSessions) {
      if (now > session.expiresAt) {
        const s = captchaSessions.get(key);
        captchaSessions.delete(key);
        if (s) {
          api.setGroupKick(s.groupId, s.userId, true).catch(() => {});
        }
      }
    }
  }, 10000);

  blacklistStore.read();
  muteLogStore.read();
  recallLogStore.read();

  // --- Events ---

  ctx.registerEvent('notice.group_increase', async (event) => {
    const e = event as GroupIncreaseEvent;
    const gmCfg = config.get<AppConfig['groupManagement']>('groupManagement');

    const blacklist = await blacklistStore.read();
    const isBanned = blacklist.entries.some(
      (b) => String(b.userId) === String(e.user_id) &&
        (b.groupId === '*' || String(b.groupId) === String(e.group_id))
    );
    if (isBanned) {
      await api.setGroupKick(e.group_id, e.user_id, true);
      log.info(`Blacklisted user kicked: ${e.user_id} from ${e.group_id}`);
      return;
    }

    if (gmCfg.captcha.enabled) {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const answer = a + b;

      const key = `${e.group_id}_${e.user_id}`;
      captchaSessions.set(key, {
        groupId: e.group_id,
        userId: e.user_id,
        answer,
        expiresAt: Date.now() + gmCfg.captcha.timeoutSeconds * 1000,
      });

      await api.sendGroupMsg(e.group_id, [
        { type: 'at', data: { qq: String(e.user_id) } },
        { type: 'text', data: { text: ` 欢迎入群！请在 ${gmCfg.captcha.timeoutSeconds} 秒内回复验证问题：${a} + ${b} = ?` } },
      ]);
    }
  }, 10);

  ctx.registerEvent('message.group', async (event) => {
    const e = event as GroupMessageEvent;
    const gmCfg = config.get<AppConfig['groupManagement']>('groupManagement');
    const raw = e.raw_message.trim();

    const captchaKey = `${e.group_id}_${e.user_id}`;
    const session = captchaSessions.get(captchaKey);
    if (session) {
      const userAnswer = parseInt(raw, 10);
      if (!isNaN(userAnswer) && userAnswer === session.answer) {
        captchaSessions.delete(captchaKey);
        await api.sendGroupMsg(e.group_id, [
          { type: 'at', data: { qq: String(e.user_id) } },
          { type: 'text', data: { text: ' 验证通过！欢迎加入~' } },
        ]);
      }
      return;
    }

    const whitelist = config.get<AppConfig['groupManagement']>('groupManagement').whitelist;
    const groupWhitelist = whitelist[String(e.group_id)] || [];
    const isWhitelisted = groupWhitelist.includes(String(e.user_id));

    if (gmCfg.adDetect.enabled && !isWhitelisted) {
      for (const rule of gmCfg.adDetect.rules) {
        if (!rule.enabled) continue;
        let matched = false;
        if (rule.type === 'keyword') {
          matched = raw.includes(rule.pattern);
        } else if (rule.type === 'regex') {
          try {
            matched = new RegExp(rule.pattern).test(raw);
          } catch {}
        }
        if (matched || /https?:\/\/[^\s]+/.test(raw)) {
          log.info(`Ad detected: ${e.user_id} in ${e.group_id}`, { pattern: rule.pattern });
          switch (gmCfg.adDetect.action) {
            case 'recall':
              await api.deleteMsg(e.message_id).catch(() => {});
              break;
            case 'mute':
              await api.setGroupBan(e.group_id, e.user_id, gmCfg.mute.defaultDuration * 60);
              break;
            case 'kick':
              await api.setGroupKick(e.group_id, e.user_id);
              break;
            case 'warn':
              await api.sendGroupMsg(e.group_id, [
                { type: 'at', data: { qq: String(e.user_id) } },
                { type: 'text', data: { text: ' 请勿发送广告信息！' } },
              ]);
              break;
          }
          return;
        }
      }
    }

    if (gmCfg.floodDetect.enabled && !isWhitelisted) {
      const floodKey = `${e.group_id}_${e.user_id}`;
      const now = Date.now();
      const existing = floodCounters.get(floodKey);

      if (existing && now - existing.firstTime < gmCfg.floodDetect.windowSeconds * 1000) {
        existing.count += 1;
        if (existing.count >= gmCfg.floodDetect.maxMessages ||
            existing.lastContent === raw) {
          floodCounters.delete(floodKey);
          switch (gmCfg.floodDetect.action) {
            case 'mute':
              await api.setGroupBan(e.group_id, e.user_id, gmCfg.mute.defaultDuration * 60);
              await api.sendGroupMsg(e.group_id, [
                { type: 'at', data: { qq: String(e.user_id) } },
                { type: 'text', data: { text: ` 刷屏检测，已被禁言 ${gmCfg.mute.defaultDuration} 分钟` } },
              ]);
              break;
            case 'warn':
              await api.sendGroupMsg(e.group_id, [
                { type: 'at', data: { qq: String(e.user_id) } },
                { type: 'text', data: { text: ' 请勿刷屏！' } },
              ]);
              break;
          }
          return;
        }
        existing.lastContent = raw;
      } else {
        floodCounters.set(floodKey, { count: 1, firstTime: now, lastContent: raw });
      }
    }
  }, 60);

  // --- Commands ---

  ctx.registerCommand({
    name: '禁言',
    aliases: ['禁言', 'mute', 'jy'],
    prefix,
    args: [
      { name: 'target', type: 'user', required: true },
      { name: 'duration', type: 'number', required: false },
      { name: 'reason', type: 'rest', required: false },
    ],
    permission: 'group_admin',
    cooldown: 3,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const targetId = Number(args.target);
      const duration = (args.duration as number) || config.get<AppConfig['groupManagement']>('groupManagement').mute.defaultDuration;
      const reason = (args.reason as string) || '无';
      const gmCfg = config.get<AppConfig['groupManagement']>('groupManagement');

      await api.setGroupBan(e.group_id, targetId, duration * 60);

      const logData = await muteLogStore.read();
      logData.logs.push({
        userId: String(targetId),
        groupId: String(e.group_id),
        operatorId: String(e.user_id),
        duration,
        reason,
        timestamp: new Date().toISOString(),
      });
      await muteLogStore.write(logData);

      if (gmCfg.mute.escalate) {
        const muteKey = `${e.group_id}_${targetId}`;
        const count = (muteHistory.get(muteKey) || 0) + 1;
        muteHistory.set(muteKey, count);

        if (gmCfg.mute.thresholds[1] > 0 && count >= gmCfg.mute.thresholds[1] && gmCfg.mute.thresholds[2] < 0) {
          await api.setGroupKick(e.group_id, targetId);
          muteHistory.delete(muteKey);
          return `用户 ${targetId} 被禁言 ${count} 次，已自动移出群聊`;
        }
      }

      return `用户 ${targetId} 已被禁言 ${duration} 分钟。原因：${reason}`;
    },
  });

  ctx.registerCommand({
    name: '撤回',
    aliases: ['撤回', 'recall', 'ch'],
    prefix,
    args: [
      { name: 'target', type: 'user', required: false },
      { name: 'count', type: 'number', required: false },
    ],
    permission: 'group_admin',
    cooldown: 2,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;

      if (e.message?.[0]?.type !== 'reply' && !args.target) {
        return '请回复需要撤回的消息，或使用 /撤回 @用户 数量';
      }

      if (e.message?.[0]?.type === 'reply') {
        await api.deleteMsg(e.message_id - 1 || e.message_id);
        const logData = await recallLogStore.read();
        logData.logs.push({
          groupId: String(e.group_id),
          operatorId: String(e.user_id),
          targetId: String(e.message?.[0]?.data?.id || 'unknown'),
          count: 1,
          timestamp: new Date().toISOString(),
        });
        await recallLogStore.write(logData);
        return '消息已撤回';
      }

      return '撤回功能需要回复目标消息';
    },
  });

  ctx.registerCommand({
    name: '黑名单添加',
    aliases: ['拉黑', '黑名单添加', 'blacklist'],
    prefix,
    args: [
      { name: 'target', type: 'user', required: true },
      { name: 'reason', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const targetId = String(args.target);
      const reason = (args.reason as string) || '无';
      const groupId = String(e.group_id);

      const data = await blacklistStore.read();
      const exists = data.entries.some((b) => b.userId === targetId && b.groupId === groupId);
      if (exists) return '该用户已在黑名单中';

      data.entries.push({
        userId: targetId,
        groupId,
        reason,
        operatorId: String(e.user_id),
        createdAt: new Date().toISOString(),
      });
      await blacklistStore.write(data);
      return `用户 ${targetId} 已加入黑名单。原因：${reason}`;
    },
  });

  ctx.registerCommand({
    name: '白名单添加',
    aliases: ['白名单添加', 'whitelist'],
    prefix,
    args: [{ name: 'target', type: 'user', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const targetId = String(args.target);
      const groupId = String(e.group_id);

      const whitelist = config.get<AppConfig['groupManagement']>('groupManagement').whitelist;
      const groupWhitelist = whitelist[groupId] || [];
      if (groupWhitelist.includes(targetId)) return '该用户已在白名单中';
      groupWhitelist.push(targetId);
      await config.set(`groupManagement.whitelist.${groupId}`, groupWhitelist);
      return `用户 ${targetId} 已加入白名单`;
    },
  });

  ctx.registerCommand({
    name: '广告规则管理',
    aliases: ['广告规则', 'adrule', 'gggz'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'type', type: 'string', required: false },
      { name: 'rest', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (event, args) => {
      const action = String(args.action);
      const gmCfg = config.get<AppConfig['groupManagement']>('groupManagement');
      const rules = [...gmCfg.adDetect.rules];

      if (action === '列表' || action === 'list') {
        if (rules.length === 0) return '暂无广告规则';
        return rules.map((r, i) => `${i + 1}. [${r.type}] ${r.pattern} ${r.enabled ? '启用' : '禁用'}`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const ruleType = String(args.type || 'keyword') as 'keyword' | 'regex';
        const pattern = String(args.rest || '');
        if (!pattern) return '用法: /广告规则 添加 keyword|regex 规则内容';
        rules.push({ id: Date.now().toString(36), name: pattern.slice(0, 10), type: ruleType, pattern, enabled: true });
        await config.set('groupManagement.adDetect.rules', rules);
        return `广告规则已添加: ${pattern}`;
      }

      if (action === '删除' || action === 'del') {
        const idx = Number(args.type) - 1;
        if (isNaN(idx) || idx < 0 || idx >= rules.length) return '无效的规则序号';
        const removed = rules.splice(idx, 1)[0];
        await config.set('groupManagement.adDetect.rules', rules);
        return `已删除规则: ${removed.pattern}`;
      }

      return '用法: /广告规则 列表|添加|删除';
    },
  });

  ctx.registerCommand({
    name: '刷屏设置',
    aliases: ['刷屏设置', 'floodset', 'spsz'],
    prefix,
    args: [
      { name: 'windowSeconds', type: 'number', required: true },
      { name: 'maxMessages', type: 'number', required: true },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const windowSec = Number(args.windowSeconds);
      const maxMsg = Number(args.maxMessages);
      await config.set('groupManagement.floodDetect.windowSeconds', windowSec);
      await config.set('groupManagement.floodDetect.maxMessages', maxMsg);
      return `刷屏检测已设置: ${windowSec}秒内超过${maxMsg}条触发`;
    },
  });

  ctx.registerCommand({
    name: '验证开关',
    aliases: ['验证开关', 'captcha', 'yzkz'],
    prefix,
    args: [{ name: 'action', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      if (action === '开启' || action === 'on' || action === '1') {
        await config.set('groupManagement.captcha.enabled', true);
        return '人机验证已开启';
      }
      if (action === '关闭' || action === 'off' || action === '0') {
        await config.set('groupManagement.captcha.enabled', false);
        return '人机验证已关闭';
      }
      return '用法: /验证开关 开启|关闭';
    },
  });

  ctx.registerCommand({
    name: '验证超时',
    aliases: ['验证超时', 'captchaTimeout'],
    prefix,
    args: [{ name: 'seconds', type: 'number', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      await config.set('groupManagement.captcha.timeoutSeconds', Number(args.seconds));
      return `验证超时已设为 ${args.seconds} 秒`;
    },
  });

  ctx.registerCommand({
    name: '黑名单移除',
    aliases: ['取消拉黑', 'unblacklist'],
    prefix,
    args: [{ name: 'target', type: 'user', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const targetId = String(args.target);
      const groupId = String(e.group_id);
      const data = await blacklistStore.read();
      const idx = data.entries.findIndex((b) => b.userId === targetId && (b.groupId === groupId || b.groupId === '*'));
      if (idx === -1) return '该用户不在黑名单中';
      data.entries.splice(idx, 1);
      await blacklistStore.write(data);
      return `用户 ${targetId} 已从黑名单移除`;
    },
  });

  ctx.registerCommand({
    name: '黑名单列表',
    aliases: ['黑名单列表', 'bllist'],
    prefix,
    args: [],
    permission: 'admin',
    cooldown: 5,
    handler: async (event) => {
      const e = event as GroupMessageEvent;
      const data = await blacklistStore.read();
      const groupEntries = data.entries.filter((b) => b.groupId === String(e.group_id) || b.groupId === '*');
      if (groupEntries.length === 0) return '黑名单为空';
      return groupEntries.map((b, i) => `${i + 1}. ${b.userId} (${b.groupId === '*' ? '全局' : '本群'}) - ${b.reason}`).join('\n');
    },
  });
}
