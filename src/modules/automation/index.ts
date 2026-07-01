import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { CronScheduler } from '../../infra/cron-scheduler';
import type { AppConfig, CronJobConfig } from '../../types/config';
import type { GroupMessageEvent, GroupUploadEvent } from '../../types/events';
import { log } from '../../infra/logger';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createAutomationModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  dataDir: string,
  cron: CronScheduler
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;

  cron.registerActionType('send_message', async (job: CronJobConfig) => {
    if (job.action.type !== 'send_message') return;
    await api.sendGroupMsg(job.action.group_id, [
      { type: 'text', data: { text: job.action.message } },
    ]);
  });

  cron.registerActionType('group_sign', async (job: CronJobConfig) => {
    if (job.action.type !== 'group_sign') return;
    await api.setGroupSign(job.action.group_id);
    log.info(`Auto sign completed for group: ${job.action.group_id}`);
  });

  cron.registerActionType('notification', async (job: CronJobConfig) => {
    if (job.action.type !== 'notification') return;
    await api.sendGroupMsg(job.action.group_id, [
      { type: 'text', data: { text: job.action.message } },
    ]);
  });

  const autoCfg = config.get<AppConfig['automation']>('automation');
  cron.loadJobs(autoCfg.cronJobs);

  if (autoCfg.autoSign.enabled) {
    for (const groupId of autoCfg.autoSign.groups) {
      cron.addJobFromConfig({
        id: `auto-sign-${groupId}`,
        name: `自动签到-${groupId}`,
        cron: autoCfg.autoSign.cron,
        action: { type: 'group_sign', group_id: groupId },
        enabled: true,
      });
    }
  }

  ctx.registerEvent('message.group', async (event) => {
    const e = event as GroupMessageEvent;
    const autoReadCfg = config.get<AppConfig['automation']>('automation').autoRead;
    if (!autoReadCfg.enabled) return;

    const whitelist = autoReadCfg.whitelist;
    if (whitelist.length === 0 || whitelist.includes(String(e.group_id)) || whitelist.includes('*')) {
      await api.markGroupMsgAsRead(e.group_id).catch(() => {});
    }
  }, 300);

  ctx.registerEvent('notice.group_upload', async (event) => {
    const e = event as GroupUploadEvent;
    const fileCfg = config.get<AppConfig['automation']>('automation').autoFileDownload;
    if (!fileCfg.enabled) return;

    try {
      const fileInfo = await api.getFile(e.file.id);
      const ext = e.file.name.split('.').pop() || '';
      if (fileCfg.filters.length > 0 && !fileCfg.filters.includes(ext)) return;

      const dir = fileCfg.directory || join(dataDir, 'files');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, e.file.name), Buffer.from(fileInfo.base64, 'base64'));
      log.info(`File downloaded: ${e.file.name}`);
    } catch (err) {
      log.error('Auto download failed', { error: String(err) });
    }
  }, 200);

  ctx.registerCommand({
    name: '定时任务',
    aliases: ['定时', 'cron', 'ds'],
    prefix,
    args: [],
    permission: 'admin',
    cooldown: 5,
    handler: async () => {
      const jobs = cron.listJobs();
      if (jobs.length === 0) return '暂无定时任务';
      const lines = jobs.map((j) => `[${j.config.enabled ? '启用' : '禁用'}] ${j.config.name} (${j.config.cron})`);
      return `定时任务列表：\n${lines.join('\n')}`;
    },
  });

  ctx.registerCommand({
    name: '创建定时任务',
    aliases: ['创建定时', 'addcron', 'cjds'],
    prefix,
    args: [
      { name: 'name', type: 'string', required: true },
      { name: 'cronExpr', type: 'string', required: true },
      { name: 'message', type: 'rest', required: true },
    ],
    permission: 'admin',
    cooldown: 5,
    handler: async (_event, args) => {
      const id = Date.now().toString(36);
      cron.addJobFromConfig({
        id,
        name: String(args.name),
        cron: String(args.cronExpr),
        action: { type: 'send_message', group_id: '', message: String(args.message) },
        enabled: true,
      });
      return `定时任务已创建: ${args.name} | ${args.cronExpr} | ${args.message}`;
    },
  });

  ctx.registerCommand({
    name: '删除定时任务',
    aliases: ['删除定时', 'delcron', 'scds'],
    prefix,
    args: [{ name: 'id', type: 'string', required: true }],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      cron.removeJob(String(args.id));
      return `定时任务 ${args.id} 已删除`;
    },
  });

  ctx.registerCommand({
    name: '自动签到管理',
    aliases: ['自动签到', 'autosign', 'zdqd'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'groupId', type: 'string', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const groups = [...config.get<AppConfig['automation']>('automation').autoSign.groups];

      if (action === '列表' || action === 'list') {
        if (groups.length === 0) return '暂无自动签到群';
        return groups.map((g, i) => `${i + 1}. ${g}`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const gid = String(args.groupId || '');
        if (!gid) return '用法: /自动签到 添加 群号';
        if (groups.includes(gid)) return '该群已在自动签到列表中';
        groups.push(gid);
        await config.set('automation.autoSign.groups', groups);
        return `群 ${gid} 已加入自动签到列表`;
      }

      if (action === '删除' || action === 'del') {
        const gid = String(args.groupId || '');
        const idx = groups.indexOf(gid);
        if (idx === -1) return '该群不在自动签到列表中';
        groups.splice(idx, 1);
        await config.set('automation.autoSign.groups', groups);
        return `群 ${gid} 已从自动签到列表移除`;
      }

      if (action === '开启' || action === 'on') {
        await config.set('automation.autoSign.enabled', true);
        return '自动签到已开启';
      }

      if (action === '关闭' || action === 'off') {
        await config.set('automation.autoSign.enabled', false);
        return '自动签到已关闭';
      }

      return '用法: /自动签到 列表|添加|删除|开启|关闭';
    },
  });

  ctx.registerCommand({
    name: '自动已读管理',
    aliases: ['自动已读', 'autoread', 'zdyd'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'groupId', type: 'string', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const groups = [...config.get<AppConfig['automation']>('automation').autoRead.whitelist];

      if (action === '列表' || action === 'list') {
        if (groups.length === 0) return '暂无自动已读群';
        return groups.map((g, i) => `${i + 1}. ${g}`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const gid = String(args.groupId || '');
        if (!gid) return '用法: /自动已读 添加 群号';
        if (groups.includes(gid)) return '该群已在自动已读列表中';
        groups.push(gid);
        await config.set('automation.autoRead.whitelist', groups);
        return `群 ${gid} 已加入自动已读列表`;
      }

      if (action === '删除' || action === 'del') {
        const gid = String(args.groupId || '');
        const idx = groups.indexOf(gid);
        if (idx === -1) return '该群不在自动已读列表中';
        groups.splice(idx, 1);
        await config.set('automation.autoRead.whitelist', groups);
        return `群 ${gid} 已从自动已读列表移除`;
      }

      if (action === '开启' || action === 'on') {
        await config.set('automation.autoRead.enabled', true);
        return '自动已读已开启';
      }

      if (action === '关闭' || action === 'off') {
        await config.set('automation.autoRead.enabled', false);
        return '自动已读已关闭';
      }

      return '用法: /自动已读 列表|添加|删除|开启|关闭';
    },
  });
}
