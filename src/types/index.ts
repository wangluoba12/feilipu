import type { PluginModule, NapCatPluginContext, PluginConfigSchema } from './types/napcat';
import { pluginState } from './core/state';
import { ConfigManager } from './infra/config';
import { ApiWrapper } from './core/api-wrapper';
import { CommandParser } from './core/command-parser';
import { EventRouter } from './core/event-router';
import { ModuleLoader } from './core/module-loader';
import { CronScheduler } from './infra/cron-scheduler';
import type { AppConfig } from './types/config';

import { createPointsModule } from './modules/points/index';
import { createGroupManagementModule } from './modules/group-management/index';
import { createSocialModule } from './modules/social/index';
import { createMessageModule } from './modules/message/index';
import { createOperationsModule } from './modules/operations/index';
import { createAutomationModule } from './modules/automation/index';
import { createAccountModule } from './modules/account/index';

let eventRouter = new EventRouter();
let commandParser = new CommandParser();
let apiWrapper = new ApiWrapper();
let configManager: ConfigManager;
let moduleLoader = new ModuleLoader();
let cronScheduler = new CronScheduler();
let dataDir = '';

export const plugin_init: PluginModule['plugin_init'] = async (ctx) => {
  ctx.logger.info('========================================');
  ctx.logger.info('  Philip v1.0.0');
  ctx.logger.info('  Command prefix: /');
  ctx.logger.info('========================================');

  pluginState.ctx = ctx;
  dataDir = ctx.dataPath;

  const initCfg = loadConfigFile(ctx.configPath);
  configManager = ConfigManager.fromObject(initCfg);
  pluginState.config = initCfg as unknown as Record<string, unknown>;
  await configManager.init();

  eventRouter = new EventRouter();
  commandParser = new CommandParser();
  apiWrapper = new ApiWrapper();
  moduleLoader = new ModuleLoader();
  cronScheduler = new CronScheduler();

  registerCoreFeatures();
  registerModules();
  setupWebUI(ctx);

  const cfg = configManager.getAll();
  if (cfg.automation?.cronJobs) {
    cronScheduler.loadJobs(cfg.automation.cronJobs);
  }

  ctx.logger.info('NapCat Bot Plugin Suite loaded successfully');
};

export const plugin_onmessage: PluginModule['plugin_onmessage'] = async (_ctx, event) => {
  if (event.post_type !== 'message' || event.message_type !== 'group') return;
  await eventRouter.dispatch(event as unknown as Parameters<EventRouter['dispatch']>[0]);
};

export const plugin_cleanup: PluginModule['plugin_cleanup'] = () => {
  cronScheduler.stopAll();
  pluginState.ctx = null;
};

export const plugin_get_config: PluginModule['plugin_get_config'] = async () => {
  return configManager?.getAll() || {};
};

export const plugin_set_config: PluginModule['plugin_set_config'] = async (_ctx, config) => {
  pluginState.config = config as Record<string, unknown>;
};

export const plugin_config_ui: PluginConfigSchema = [
  { key: 'bot.name', label: '机器人名称', type: 'string', default: '群管机器人' },
  { key: 'bot.commandPrefix', label: '命令前缀', type: 'string', default: '/' },
  { key: 'points.enabled', label: '积分系统', type: 'boolean', default: true },
  { key: 'points.dailyCheckin', label: '每日签到积分', type: 'number', default: 10 },
  { key: 'groupManagement.enabled', label: '群管系统', type: 'boolean', default: true },
  { key: 'groupManagement.floodDetect.enabled', label: '刷屏检测', type: 'boolean', default: true },
  { key: 'groupManagement.adDetect.enabled', label: '广告检测', type: 'boolean', default: true },
  { key: 'groupManagement.captcha.enabled', label: '人机验证', type: 'boolean', default: false },
  { key: 'operations.welcome.enabled', label: '入群欢迎', type: 'boolean', default: true },
  { key: 'operations.referral.enabled', label: '引流功能', type: 'boolean', default: false },
  { key: 'automation.autoSign.enabled', label: '自动签到', type: 'boolean', default: false },
  { key: 'automation.autoRead.enabled', label: '自动已读', type: 'boolean', default: true },
  { key: 'account.avatarRotation.enabled', label: '头像轮换', type: 'boolean', default: false },
  { key: 'account.dynamicSignature.enabled', label: '动态签名', type: 'boolean', default: false },
];

function registerCoreFeatures(): void {
  eventRouter.register('core', 'message.group', async (event) => {
    const msg = event as Record<string, unknown>;
    if (!msg.raw_message) return;

    const parsed = commandParser.parse(String(msg.raw_message));
    if (!parsed) return;

    const cmdEntry = commandParser.getCommands().find((c) => c.def.name === parsed.name);
    if (!cmdEntry) return;

    const cooldown = cmdEntry.def.cooldown || 0;
    if (!commandParser.checkCooldown(parsed.name, String(msg.user_id), cooldown)) {
      await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: 'text', data: { text: '命令冷却中，请稍后再试' } }]);
      return;
    }

    const userId = String(msg.user_id);
    const sender = (msg.sender as Record<string, string>) || {};
    const admins: string[] = configManager.get<AppConfig['bot']>('bot').admins || [];

    switch (cmdEntry.def.permission) {
      case 'admin':
        if (!admins.includes(userId)) return;
        break;
      case 'group_admin':
        if (sender.role !== 'owner' && sender.role !== 'admin') return;
        break;
    }

    try {
      const result = await parsed.handler(event, parsed.args);
      if (result) {
        await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: 'text', data: { text: result } }]);
      }
    } catch (err) {
      pluginState.ctx?.logger.error('Command handler error', String(err));
      await apiWrapper.sendGroupMsg(Number(msg.group_id), [{ type: 'text', data: { text: '命令执行出错' } }]);
    }
  }, 50);
}

function registerModules(): void {
  const cfg = configManager.getAll();

  moduleLoader.register({
    id: 'points', name: '积分与会员', version: '1.0.0',
    enabled: cfg.points?.enabled ?? true,
    load: async () => { createPointsModule(getCtx('points'), apiWrapper, configManager, dataDir); },
    unload: async () => { eventRouter.unregister('points'); commandParser.unregister('points'); },
  });

  moduleLoader.register({
    id: 'group-management', name: '群管系统', version: '1.0.0',
    enabled: cfg.groupManagement?.enabled ?? true,
    load: async () => { createGroupManagementModule(getCtx('group-management'), apiWrapper, configManager, dataDir); },
    unload: async () => { eventRouter.unregister('group-management'); commandParser.unregister('group-management'); },
  });

  moduleLoader.register({
    id: 'social', name: '社交互动', version: '1.0.0',
    enabled: cfg.social?.poke?.enabled ?? true,
    load: async () => { createSocialModule(getCtx('social'), apiWrapper, configManager, dataDir); },
    unload: async () => { eventRouter.unregister('social'); commandParser.unregister('social'); },
  });

  moduleLoader.register({
    id: 'message', name: '消息处理', version: '1.0.0', enabled: true,
    load: async () => { createMessageModule(getCtx('message'), apiWrapper, configManager, dataDir); },
    unload: async () => { eventRouter.unregister('message'); commandParser.unregister('message'); },
  });

  moduleLoader.register({
    id: 'operations', name: '运营工具', version: '1.0.0',
    enabled: cfg.operations?.welcome?.enabled ?? true,
    load: async () => { createOperationsModule(getCtx('operations'), apiWrapper, configManager, dataDir); },
    unload: async () => { eventRouter.unregister('operations'); commandParser.unregister('operations'); },
  });

  moduleLoader.register({
    id: 'automation', name: '自动化', version: '1.0.0', enabled: true,
    load: async () => { createAutomationModule(getCtx('automation'), apiWrapper, configManager, dataDir, cronScheduler); },
    unload: async () => { eventRouter.unregister('automation'); commandParser.unregister('automation'); },
  });

  moduleLoader.register({
    id: 'account', name: '账号管理', version: '1.0.0', enabled: true,
    load: async () => { createAccountModule(getCtx('account'), apiWrapper, configManager, dataDir, cronScheduler); },
    unload: async () => { eventRouter.unregister('account'); commandParser.unregister('account'); },
  });

  moduleLoader.loadAll();
}

function getCtx(moduleId: string) {
  const cfg = configManager.getAll();
  return {
    registerEvent: (eventType: string, handler: Parameters<EventRouter['register']>[2], priority?: number) => {
      eventRouter.register(moduleId, eventType, handler, priority);
    },
    registerCommand: (command: Parameters<CommandParser['register']>[1]) => {
      commandParser.register(moduleId, command);
    },
    isAdmin: (userId: string) => (cfg.bot?.admins || []).includes(userId),
  };
}

function setupWebUI(ctx: NapCatPluginContext): void {
  try {
    ctx.router.page({
      path: 'dashboard',
      title: '群管控制面板',
      htmlFile: 'webui/index.html',
      description: '管理群管、积分、社交等模块',
    });
    ctx.router.static('/static', 'webui');

    ctx.router.get('/api/modules', (_req, res) => {
      res.status(200).json(moduleLoader.getModuleStatus());
    });

    ctx.router.get('/api/config', (_req, res) => {
      res.status(200).json(configManager.getAll());
    });

    ctx.router.put('/api/config', async (req, res) => {
      try {
        pluginState.config = req.body as Record<string, unknown>;
        res.status(200).json({ success: true });
      } catch (err) {
        res.status(400).json({ error: String(err) });
      }
    });
  } catch {
    pluginState.ctx?.logger.warn('WebUI routes not available');
  }
}

function loadConfigFile(configPath: string): AppConfig {
  try {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(configPath + '/config.json', 'utf-8'));
  } catch {
    return {} as AppConfig;
  }
}
