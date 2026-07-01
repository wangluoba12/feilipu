import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { AppConfig, TitleMapping } from '../../types/config';
import type { GroupMessageEvent } from '../../types/events';
import { PointsCore } from './points-core';
import { CheckinManager } from './checkin';
import { CdkManager } from './cdk';
import { TitleManager } from './title';
import { ProfileManager } from './profile';
import { StatsManager } from './stats';

export function createPointsModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  dataDir: string
): void {
  const pointsCore = new PointsCore(dataDir);
  const checkinManager = new CheckinManager(pointsCore);
  const cdkManager = new CdkManager(dataDir, pointsCore);
  const titleManager = new TitleManager(api, config, pointsCore);
  const profileManager = new ProfileManager(dataDir, pointsCore);
  const statsManager = new StatsManager(dataDir);

  pointsCore.init();
  cdkManager.init();
  statsManager.init();

  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;

  ctx.registerEvent('message.group', async (event) => {
    const msgEvent = event as GroupMessageEvent;
    const pointsCfg = config.get<AppConfig['points']>('points');
    if (!pointsCfg.enabled) return;

    await pointsCore.addPoints(
      msgEvent.user_id,
      msgEvent.group_id,
      pointsCfg.perMessage,
      pointsCfg.maxPerMinute
    );

    await titleManager.checkAndUpdateTitle(msgEvent.user_id, msgEvent.group_id);
    await statsManager.recordMessage(msgEvent);
  }, 200);

  ctx.registerCommand({
    name: '签到',
    aliases: ['签到', 'checkin', 'qd'],
    prefix,
    args: [],
    permission: 'all',
    cooldown: 5,
    handler: async (event) => {
      const msgEvent = event as GroupMessageEvent;
      const pointsCfg = config.get<AppConfig['points']>('points');
      const { message } = await checkinManager.doCheckin(
        msgEvent.user_id,
        msgEvent.group_id,
        pointsCfg.dailyCheckin,
        pointsCfg.streakBonus
      );
      return message;
    },
  });

  ctx.registerCommand({
    name: '积分',
    aliases: ['积分', 'points', 'jf', 'my'],
    prefix,
    args: [],
    permission: 'all',
    cooldown: 3,
    handler: async (event) => {
      const msgEvent = event as GroupMessageEvent;
      const record = await pointsCore.getRecord(msgEvent.user_id, msgEvent.group_id);
      return `当前积分：${record.points} | 累计：${record.totalPoints} | 连续签到：${record.checkinStreak}天`;
    },
  });

  ctx.registerCommand({
    name: '积分排行',
    aliases: ['积分排行', 'rank', 'phb'],
    prefix,
    args: [],
    permission: 'all',
    cooldown: 10,
    handler: async (event) => {
      const msgEvent = event as GroupMessageEvent;
      const ranking = await pointsCore.getRanking(msgEvent.group_id, 10);
      if (ranking.length === 0) return '暂无积分数据';
      const lines = ranking.map((r, i) => `${i + 1}. ${r.userId} - ${r.points}分`);
      return `积分排行榜：\n${lines.join('\n')}`;
    },
  });

  ctx.registerCommand({
    name: 'cdk',
    aliases: ['cdk', '兑换', 'dh'],
    prefix,
    args: [{ name: 'code', type: 'string', required: true }],
    permission: 'all',
    cooldown: 5,
    handler: async (event, args) => {
      const msgEvent = event as GroupMessageEvent;
      const { message } = await cdkManager.redeem(
        String(args.code),
        String(msgEvent.user_id),
        String(msgEvent.group_id)
      );
      return message;
    },
  });

  ctx.registerCommand({
    name: '名片',
    aliases: ['名片', 'profile', 'mp'],
    prefix,
    args: [],
    permission: 'all',
    cooldown: 5,
    handler: async (event) => {
      const msgEvent = event as GroupMessageEvent;
      const { profile, points } = await profileManager.getProfile(
        String(msgEvent.user_id),
        String(msgEvent.group_id)
      );
      const lines = [`用户：${profile.nickname || msgEvent.user_id}`];
      if (profile.bio) lines.push(`简介：${profile.bio}`);
      lines.push(`积分：${points.points} | 签到：${points.checkinStreak}天`);
      return lines.join('\n');
    },
  });

  ctx.registerCommand({
    name: '发言统计',
    aliases: ['发言统计', 'stats', 'fytj'],
    prefix,
    args: [{ name: 'period', type: 'string', required: false }],
    permission: 'all',
    cooldown: 10,
    handler: async (event, args) => {
      const msgEvent = event as GroupMessageEvent;
      const periodStr = (args.period as string) || 'week';
      const period = periodStr === 'month' ? 'month' : periodStr === 'day' ? 'day' : 'week';
      const stats = await statsManager.getGroupStats(msgEvent.group_id, period);
      if (stats.length === 0) return '暂无发言统计';
      const top10 = stats.slice(0, 10);
      const periodLabel = { day: '今日', week: '本周', month: '本月' }[period];
      const lines = top10.map((s, i) => `${i + 1}. ${s.userId} - ${s.count}条`);
      return `${periodLabel}发言排行：\n${lines.join('\n')}`;
    },
  });

  ctx.registerCommand({
    name: '创建CDK',
    aliases: ['创建cdk', 'makecdk', 'cjcdk'],
    prefix,
    args: [
      { name: 'name', type: 'string', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'count', type: 'number', required: true },
    ],
    permission: 'admin',
    cooldown: 10,
    handler: async (_event, args) => {
      const expireAt = new Date(Date.now() + 90 * 86400000).toISOString();
      const batch = await cdkManager.createBatch(String(args.name), Number(args.amount), Number(args.count), expireAt);
      return `CDK 批次已创建: ${batch.name} | ${batch.count} 个 | 面额 ${batch.amount} 积分 | ID: ${batch.id}`;
    },
  });

  ctx.registerCommand({
    name: 'CDK列表',
    aliases: ['cdk列表', 'cdklist'],
    prefix,
    args: [],
    permission: 'admin',
    cooldown: 5,
    handler: async () => {
      const batches = await cdkManager.getBatches();
      if (batches.length === 0) return '暂无 CDK 批次';
      return batches.map((b) => `[${b.id}] ${b.name} | ${b.usedCount}/${b.count} 已用 | ${b.amount}积分`).join('\n');
    },
  });

  ctx.registerCommand({
    name: 'CDK导出',
    aliases: ['cdk导出', 'exportcdk'],
    prefix,
    args: [{ name: 'batchId', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 10,
    handler: async (_event, args) => {
      const codes = await cdkManager.getUnusedCodes(String(args.batchId));
      if (codes.length === 0) return '该批次无未使用 CDK';
      return `未使用 CDK (${codes.length}个):\n${codes.map((c) => c.code).join('\n')}`;
    },
  });

  ctx.registerCommand({
    name: '加减分',
    aliases: ['加减分', 'setpoints', 'jjf'],
    prefix,
    args: [
      { name: 'target', type: 'user', required: true },
      { name: 'amount', type: 'number', required: true },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const record = await pointsCore.getRecord(Number(args.target), e.group_id);
      const newPoints = record.points + Number(args.amount);
      await pointsCore.setPoints(Number(args.target), e.group_id, Math.max(0, newPoints));
      return `用户 ${args.target} 积分已调整为 ${Math.max(0, newPoints)}`;
    },
  });

  ctx.registerCommand({
    name: '签到设置',
    aliases: ['签到设置', 'checkinset', 'qdsz'],
    prefix,
    args: [
      { name: 'key', type: 'string', required: true },
      { name: 'value', type: 'string', required: true },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const key = String(args.key);
      const val = String(args.value);
      if (key === '每日积分') {
        await config.set('points.dailyCheckin', Number(val));
        return `每日签到基础积分已设为 ${val}`;
      }
      if (key === '递增系数') {
        const tiers = val.split(',').map(Number);
        await config.set('points.streakBonus', tiers);
        return `签到递增系数已设为 ${val}`;
      }
      if (key === '开关' || key === 'enabled') {
        await config.set('points.enabled', val === 'on' || val === '开启' || val === 'true');
        return `积分系统已${val === 'on' || val === '开启' ? '开启' : '关闭'}`;
      }
      return '支持的设置项: 每日积分, 递增系数, 开关';
    },
  });

  ctx.registerCommand({
    name: '称号管理',
    aliases: ['称号', 'title', 'ch'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'rest', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const titles = [...(config.get<TitleMapping[]>('points.titleMappings') || [])];

      if (action === '列表' || action === 'list') {
        if (titles.length === 0) return '暂无称号配置';
        return titles.map((t, i) => `${i + 1}. ${t.title} (需${t.points}积分)`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const rest = String(args.rest || '');
        const parts = rest.split(/\s+/);
        const title = parts[0];
        const minPoints = Number(parts[1]);
        if (!title || isNaN(minPoints)) return '用法: /称号 添加 名称 最低积分';
        titles.push({ title, points: minPoints });
        await config.set('points.titleMappings', titles);
        return `称号已添加: ${title} (需${minPoints}积分)`;
      }

      if (action === '删除' || action === 'del') {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= titles.length) return '无效的序号';
        const removed = titles.splice(idx, 1)[0];
        await config.set('points.titleMappings', titles);
        return `已删除称号: ${removed.title}`;
      }

      return '用法: /称号 列表|添加|删除';
    },
  });
}
