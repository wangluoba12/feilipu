import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { AppConfig } from '../../types/config';
import type { GroupMessageEvent, GroupIncreaseEvent } from '../../types/events';

interface ReferralData {
  conversions: { groupId: string; targetGroupId: string; userId: string; time: string }[];
}

export function createOperationsModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  _dataDir: string
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;

  ctx.registerEvent('notice.group_increase', async (event) => {
    const e = event as GroupIncreaseEvent;
    const opsCfg = config.get<AppConfig['operations']>('operations');
    if (opsCfg.welcome.enabled) {
      const template = opsCfg.welcome.template
        .replace('{user}', `[CQ:at,qq=${e.user_id}]`)
        .replace('{group}', String(e.group_id));

      await api.sendGroupMsg(e.group_id, [
        { type: 'text', data: { text: template } },
      ]);
    }
  }, 10);

  ctx.registerCommand({
    name: '引流',
    aliases: ['引流', 'referral', 'yl'],
    prefix,
    args: [],
    permission: 'all',
    cooldown: 10,
    handler: async (_event) => {
      const opsCfg = config.get<AppConfig['operations']>('operations');
      if (!opsCfg.referral.enabled || opsCfg.referral.targets.length === 0) {
        return '暂无引流目标群';
      }

      const targets = opsCfg.referral.targets
        .map((t) => `${t.name} (群号: ${t.groupId})，加入可得 ${t.bonus} 积分`)
        .join('\n');

      return `引流目标群：\n${targets}\n加入后使用 "${prefix}引流签到 群号" 领取奖励`;
    },
  });

  ctx.registerCommand({
    name: '引流签到',
    aliases: ['引流签到', 'ylsign'],
    prefix,
    args: [{ name: 'groupId', type: 'string', required: true }],
    permission: 'all',
    cooldown: 30,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const opsCfg = config.get<AppConfig['operations']>('operations');
      const target = opsCfg.referral.targets.find((t) => t.groupId === String(args.groupId));
      if (!target) return '无效的引流群号';

      try {
        const memberInfo = await api.getGroupMemberInfo(Number(target.groupId), e.user_id);
        if (memberInfo) {
          return `引流签到成功！请在 ${prefix}cdk ${target.groupId}_${e.user_id} 领取 ${target.bonus} 奖励积分`;
        }
      } catch {
        return '请先加入目标群后再签到';
      }

      return '请先加入目标群后再签到';
    },
  });

  ctx.registerCommand({
    name: '欢迎消息',
    aliases: ['欢迎消息', 'welcome', 'hyxx'],
    prefix,
    args: [{ name: 'action', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const opsCfg = config.get<AppConfig['operations']>('operations');
      if (action === '开启' || action === 'on') {
        await config.set('operations.welcome.enabled', true);
        return `欢迎消息已开启。当前模板: ${opsCfg.welcome.template}`;
      }
      if (action === '关闭' || action === 'off') {
        await config.set('operations.welcome.enabled', false);
        return '欢迎消息已关闭';
      }
      return '用法: /欢迎消息 开启|关闭';
    },
  });

  ctx.registerCommand({
    name: '欢迎模板',
    aliases: ['欢迎模板', 'welcomeTpl'],
    prefix,
    args: [{ name: 'text', type: 'rest', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      await config.set('operations.welcome.template', String(args.text));
      return `欢迎模板已更新: ${args.text}`;
    },
  });

  ctx.registerCommand({
    name: '引流目标',
    aliases: ['引流管理', 'refmanage'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'groupId', type: 'string', required: false },
      { name: 'rest', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const opsCfg = config.get<AppConfig['operations']>('operations');
      const targets = [...opsCfg.referral.targets];

      if (action === '列表' || action === 'list') {
        if (targets.length === 0) return '暂无引流目标群';
        return targets.map((t, i) => `${i + 1}. ${t.name} (${t.groupId}) +${t.bonus}积分`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const rest = String(args.rest || '');
        const parts = rest.split(/\s+/);
        const groupId = String(args.groupId || parts[0] || '');
        const name = parts[1] || groupId;
        const bonus = Number(parts[2]) || 50;
        if (!groupId) return '用法: /引流管理 添加 群号 名称 积分';
        targets.push({ groupId, name, bonus: Math.max(1, bonus) });
        await config.set('operations.referral.targets', targets);
        return `引流目标已添加: ${name} (${groupId})`;
      }

      if (action === '删除' || action === 'del') {
        const gid = String(args.groupId || '');
        const idx = targets.findIndex((t) => t.groupId === gid);
        if (idx === -1) return '未找到该引流目标';
        const removed = targets.splice(idx, 1)[0];
        await config.set('operations.referral.targets', targets);
        return `已删除引流目标: ${removed.name} (${removed.groupId})`;
      }

      return '用法: /引流管理 列表|添加|删除';
    },
  });

  ctx.registerCommand({
    name: '引流开关',
    aliases: ['引流开关'],
    prefix,
    args: [{ name: 'action', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      if (String(args.action) === '开启' || String(args.action) === 'on') {
        await config.set('operations.referral.enabled', true);
        return '引流功能已开启';
      }
      if (String(args.action) === '关闭' || String(args.action) === 'off') {
        await config.set('operations.referral.enabled', false);
        return '引流功能已关闭';
      }
      return '用法: /引流开关 开启|关闭';
    },
  });
}
