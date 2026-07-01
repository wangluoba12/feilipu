import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { AppConfig } from '../../types/config';
import type { GroupMessageEvent, GroupUploadEvent } from '../../types/events';
import { JsonStorage } from '../../infra/storage';
import { log } from '../../infra/logger';

interface ArchiveData {
  messages: { groupId: string; userId: string; nickname: string; content: string; time: string }[];
}

interface StickerData {
  stickers: { id: string; name: string; url: string; keywords: string[] }[];
}

export function createMessageModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  dataDir: string
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;
  const archiveStore = new JsonStorage<ArchiveData>(`${dataDir}/archive.json`, { messages: [] });
  const stickerStore = new JsonStorage<StickerData>(`${dataDir}/stickers.json`, { stickers: [] });

  archiveStore.read();
  stickerStore.read();

  ctx.registerEvent('message.group', async (event) => {
    const e = event as GroupMessageEvent;
    const retentionDays = config.get<number>('message.archiveRetentionDays') || 7;

    const data = await archiveStore.read();
    data.messages.push({
      groupId: String(e.group_id),
      userId: String(e.user_id),
      nickname: e.sender.nickname,
      content: e.raw_message,
      time: new Date().toISOString(),
    });

    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    data.messages = data.messages.filter((m) => m.time > cutoff);
    if (data.messages.length > 10000) {
      data.messages = data.messages.slice(-5000);
    }

    await archiveStore.write(data);
  }, 300);

  ctx.registerEvent('notice.group_upload', async (event) => {
    const e = event as GroupUploadEvent;
    const fileCfg = config.get<AppConfig['automation']>('automation').autoFileDownload;
    if (!fileCfg.enabled) return;

    try {
      const fileInfo = await api.getFile(e.file.id);
      log.info(`File uploaded in group ${e.group_id}: ${e.file.name}`);
    } catch (err) {
      log.error('Failed to get uploaded file', { error: String(err) });
    }
  }, 200);

  ctx.registerCommand({
    name: '翻译',
    aliases: ['翻译', 'translate', 'fy'],
    prefix,
    args: [{ name: 'text', type: 'rest', required: true }],
    permission: 'all',
    cooldown: 3,
    handler: async (_event, args) => {
      const text = String(args.text);
      const results = await api.translateEn2Zh([text]);
      if (results.length > 0) {
        return `翻译：${results[0]}`;
      }
      return '翻译失败';
    },
  });

  ctx.registerCommand({
    name: '表情',
    aliases: ['表情', 'sticker', 'bq'],
    prefix,
    args: [{ name: 'keyword', type: 'rest', required: true }],
    permission: 'all',
    cooldown: 2,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const data = await stickerStore.read();
      const keyword = String(args.keyword).toLowerCase();

      const matches = data.stickers.filter((s) =>
        s.keywords.some((k) => k.toLowerCase().includes(keyword))
      );

      if (matches.length > 0) {
        await api.sendGroupMsg(e.group_id, [
          { type: 'image', data: { file: matches[0].url } },
        ]);
        return null;
      }

      try {
        const faces = await api.fetchCustomFace(1);
        if (faces.length > 0) {
          await api.sendGroupMsg(e.group_id, [
            { type: 'image', data: { file: faces[0] } },
          ]);
          return null;
        }
      } catch {}

      return '没有找到相关表情';
    },
  });

  ctx.registerCommand({
    name: '转发',
    aliases: ['转发', 'forward', 'fwd'],
    prefix,
    args: [
      { name: 'target', type: 'number', required: true },
      { name: 'msgId', type: 'string', required: false },
    ],
    permission: 'admin',
    cooldown: 5,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;

      if (e.message?.[0]?.type === 'reply') {
        const replyId = Number(e.message[0].data.id);
        await api.forwardGroupSingleMsg(replyId, Number(args.target));
        return '消息已转发';
      }

      return '请回复要转发的消息';
    },
  });
}
