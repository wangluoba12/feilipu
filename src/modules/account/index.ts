import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { CronScheduler } from '../../infra/cron-scheduler';
import type { AppConfig } from '../../types/config';
import { log } from '../../infra/logger';

export function createAccountModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  _dataDir: string,
  cron: CronScheduler
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;

  const accCfg = config.get<AppConfig['account']>('account');

  if (accCfg.avatarRotation.enabled && accCfg.avatarRotation.avatars.length > 0) {
    let avaIdx = 0;
    cron.addJobFromConfig({
      id: 'avatar-rotate',
      name: '头像轮换',
      cron: accCfg.avatarRotation.cron,
      action: { type: 'avatar_rotate' },
      enabled: true,
    });
    cron.registerActionType('avatar_rotate', async () => {
      const avatar = accCfg.avatarRotation.avatars[avaIdx % accCfg.avatarRotation.avatars.length];
      avaIdx++;
      await api.setQqAvatar(avatar);
      log.info(`Avatar rotated to: ${avatar}`);
    });
  }

  if (accCfg.dynamicSignature.enabled && accCfg.dynamicSignature.templates.length > 0) {
    let sigIdx = 0;
    cron.addJobFromConfig({
      id: 'signature-update',
      name: '签名更新',
      cron: accCfg.dynamicSignature.cron,
      action: { type: 'signature_update' },
      enabled: true,
    });
    cron.registerActionType('signature_update', async () => {
      let template = accCfg.dynamicSignature.templates[sigIdx % accCfg.dynamicSignature.templates.length];
      sigIdx++;
      const now = new Date();
      template = template
        .replace('{time}', now.toLocaleTimeString())
        .replace('{date}', now.toLocaleDateString())
        .replace('{weekday}', ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]);
      await api.setSelfLongnick(template);
      log.info(`Signature updated: ${template}`);
    });
  }

  if (accCfg.onlineStatus.enabled && accCfg.onlineStatus.schedule.length > 0) {
    for (const sched of accCfg.onlineStatus.schedule) {
      const [fromH, fromM] = sched.from.split(':').map(Number);
      const [toH, toM] = sched.to.split(':').map(Number);
      cron.addJobFromConfig({
        id: `status-${sched.from}`,
        name: `状态切换-${sched.from}`,
        cron: `${fromM} ${fromH} * * *`,
        action: { type: 'status_change', status: sched.status, ext_status: sched.ext_status },
        enabled: true,
      });
      cron.addJobFromConfig({
        id: `status-reset-${sched.to}`,
        name: `状态恢复-${sched.to}`,
        cron: `${toM} ${toH} * * *`,
        action: { type: 'status_change', status: 10, ext_status: 0 },
        enabled: true,
      });
    }
  }

  cron.registerActionType('status_change', async (job) => {
    if (job.action.type !== 'status_change') return;
    await api.setOnlineStatus(job.action.status, job.action.ext_status, 100);
    log.info(`Online status changed: ${job.action.status}`);
  });

  ctx.registerCommand({
    name: '好友列表',
    aliases: ['好友', 'friends', 'hy'],
    prefix,
    args: [],
    permission: 'admin',
    cooldown: 30,
    handler: async () => {
      try {
        const friends = await api.getFriendsWithCategory();
        if (friends.length === 0) return '暂无好友数据';
        const lines = friends.map((cat) => {
          const buddyNames = cat.buddyList.slice(0, 5).map((b) => b.nick).join(', ');
          const more = cat.buddyList.length > 5 ? `...等${cat.buddyList.length}人` : '';
          return `[${cat.categoryName}] ${buddyNames}${more}`;
        });
        return `好友列表：\n${lines.join('\n')}`;
      } catch {
        return '获取好友列表失败';
      }
    },
  });

  ctx.registerCommand({
    name: '点赞统计',
    aliases: ['点赞', 'likes', 'dz'],
    prefix,
    args: [],
    permission: 'admin',
    cooldown: 30,
    handler: async () => {
      try {
        const data = await api.getProfileLike();
        return `点赞统计：总数 ${data.total_count} | 新增 ${data.new_count}`;
      } catch {
        return '获取点赞数据失败';
      }
    },
  });

  ctx.registerCommand({
    name: '头像管理',
    aliases: ['头像', 'avatar', 'tx'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'url', type: 'string', required: false },
    ],
    permission: 'admin',
    cooldown: 5,
    handler: async (_event, args) => {
      const avatars = [...config.get<AppConfig['account']>('account').avatarRotation.avatars];

      if (String(args.action) === '列表' || String(args.action) === 'list') {
        if (avatars.length === 0) return '头像列表为空';
        return avatars.map((a, i) => `${i + 1}. ${a}`).join('\n');
      }

      if (String(args.action) === '添加' || String(args.action) === 'add') {
        const url = String(args.url || '');
        if (!url) return '用法: /头像 添加 图片URL';
        avatars.push(url);
        await config.set('account.avatarRotation.avatars', avatars);
        return `头像已添加: ${url} (共 ${avatars.length} 个)`;
      }

      if (String(args.action) === '删除' || String(args.action) === 'del') {
        const idx = Number(args.url) - 1;
        if (isNaN(idx) || idx < 0 || idx >= avatars.length) return '无效的序号';
        avatars.splice(idx, 1);
        await config.set('account.avatarRotation.avatars', avatars);
        return `头像已删除 (剩余 ${avatars.length} 个)`;
      }

      return '用法: /头像 列表|添加|删除';
    },
  });

  ctx.registerCommand({
    name: '签名管理',
    aliases: ['签名', 'signature', 'qm'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'rest', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 5,
    handler: async (_event, args) => {
      const tmpls = [...config.get<AppConfig['account']>('account').dynamicSignature.templates];

      if (String(args.action) === '列表' || String(args.action) === 'list') {
        if (tmpls.length === 0) return '签名模板为空';
        return tmpls.map((t, i) => `${i + 1}. ${t}`).join('\n');
      }

      if (String(args.action) === '添加' || String(args.action) === 'add') {
        const text = String(args.rest || '');
        if (!text) return '用法: /签名 添加 模板文本 (可用: {time} {date} {weekday})';
        tmpls.push(text);
        await config.set('account.dynamicSignature.templates', tmpls);
        return `签名模板已添加: ${text}`;
      }

      if (String(args.action) === '删除' || String(args.action) === 'del') {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= tmpls.length) return '无效的序号';
        tmpls.splice(idx, 1);
        await config.set('account.dynamicSignature.templates', tmpls);
        return `签名模板已删除 (剩余 ${tmpls.length} 个)`;
      }

      return '用法: /签名 列表|添加|删除';
    },
  });

  ctx.registerCommand({
    name: '状态开关',
    aliases: ['状态开关', 'status'],
    prefix,
    args: [{ name: 'action', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      if (action === '开启' || action === 'on') {
        await config.set('account.onlineStatus.enabled', true);
        return '在线状态自动切换已开启';
      }
      if (action === '关闭' || action === 'off') {
        await config.set('account.onlineStatus.enabled', false);
        return '在线状态自动切换已关闭';
      }
      return '用法: /状态开关 开启|关闭';
    },
  });
}
