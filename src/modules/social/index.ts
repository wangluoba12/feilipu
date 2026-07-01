import type { ModuleCtx } from '../../core/module-loader';
import type { ApiWrapper } from '../../core/api-wrapper';
import type { ConfigManager } from '../../infra/config';
import type { AppConfig } from '../../types/config';
import type { GroupMessageEvent } from '../../types/events';
import { JsonStorage } from '../../infra/storage';

interface VoteData {
  votes: {
    id: string;
    groupId: string;
    creatorId: string;
    title: string;
    options: { index: number; text: string; voters: string[] }[];
    multiple: boolean;
    expiresAt: string;
    closed: boolean;
  }[];
}

interface LotteryData {
  lotteries: {
    id: string;
    groupId: string;
    creatorId: string;
    description: string;
    prizeCount: number;
    minPoints: number;
    expiresAt: string;
    participants: string[];
    winners: string[];
    closed: boolean;
  }[];
}

interface QAData {
  entries: { id: string; keywords: string[]; answer: string; matchMode: string; groupId: string }[];
}

export function createSocialModule(
  ctx: ModuleCtx,
  api: ApiWrapper,
  config: ConfigManager,
  dataDir: string
): void {
  const prefix = config.get<AppConfig['bot']>('bot').commandPrefix;
  const voteStore = new JsonStorage<VoteData>(`${dataDir}/vote.json`, { votes: [] });
  const lotteryStore = new JsonStorage<LotteryData>(`${dataDir}/lottery.json`, { lotteries: [] });
  const qaStore = new JsonStorage<QAData>(`${dataDir}/qa.json`, { entries: [] });

  voteStore.read();
  lotteryStore.read();
  qaStore.read();

  ctx.registerCommand({
    name: '戳一戳',
    aliases: ['戳一戳', 'poke', 'c'],
    prefix,
    args: [{ name: 'target', type: 'user', required: true }],
    permission: 'all',
    cooldown: config.get<AppConfig['social']>('social').poke.cooldown,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      await api.sendPoke(Number(args.target), e.group_id);
      return null;
    },
  });

  ctx.registerCommand({
    name: '投票',
    aliases: ['投票', 'vote', 'tp'],
    prefix,
    args: [
      { name: 'title', type: 'string', required: true },
      { name: 'options', type: 'rest', required: true },
    ],
    permission: 'all',
    cooldown: 10,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const optionTexts = (args.options as string).split(/[,，|、]/).map((s: string) => s.trim()).filter(Boolean);

      if (optionTexts.length < 2) return '投票需要至少2个选项，用逗号或竖线分隔';

      const data = await voteStore.read();
      const vote = {
        id: Date.now().toString(36),
        groupId: String(e.group_id),
        creatorId: String(e.user_id),
        title: String(args.title),
        options: optionTexts.map((text: string, i: number) => ({ index: i + 1, text, voters: [] })),
        multiple: false,
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
        closed: false,
      };
      data.votes.push(vote);
      await voteStore.write(data);

      const lines = [`投票：${vote.title}`, `ID: ${vote.id}`, ''];
      vote.options.forEach((o) => lines.push(`${o.index}. ${o.text}`));
      lines.push('', `回复投票编号参与投票，如 "投票 ${vote.id} 1"`);

      return lines.join('\n');
    },
  });

  ctx.registerCommand({
    name: '投票参与',
    aliases: ['投票参与', 'castvote'],
    prefix,
    args: [
      { name: 'voteId', type: 'string', required: true },
      { name: 'option', type: 'number', required: true },
    ],
    permission: 'all',
    cooldown: 2,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const data = await voteStore.read();
      const vote = data.votes.find((v) => v.id === String(args.voteId) && !v.closed);

      if (!vote) return '投票不存在或已结束';
      if (new Date(vote.expiresAt) < new Date()) {
        vote.closed = true;
        await voteStore.write(data);
        return '投票已过期';
      }

      const option = vote.options[Number(args.option) - 1];
      if (!option) return '无效的选项编号';

      if (!vote.multiple) {
        const alreadyVoted = vote.options.some((o) => o.voters.includes(String(e.user_id)));
        if (alreadyVoted) return '你已经投过票了';
      }

      option.voters.push(String(e.user_id));
      await voteStore.write(data);
      return `已投票：${option.text} (当前 ${option.voters.length} 票)`;
    },
  });

  ctx.registerCommand({
    name: '投票结果',
    aliases: ['投票结果', 'voteresult'],
    prefix,
    args: [{ name: 'voteId', type: 'string', required: true }],
    permission: 'all',
    cooldown: 3,
    handler: async (event, args) => {
      const data = await voteStore.read();
      const vote = data.votes.find((v) => v.id === String(args.voteId));
      if (!vote) return '投票不存在';
      const lines = [`投票：${vote.title}`, ''];
      vote.options.forEach((o) => lines.push(`${o.index}. ${o.text} - ${o.voters.length} 票`));
      return lines.join('\n');
    },
  });

  ctx.registerCommand({
    name: '抽奖',
    aliases: ['抽奖', 'lottery', 'cj'],
    prefix,
    args: [{ name: 'description', type: 'rest', required: true }],
    permission: 'group_admin',
    cooldown: 30,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const parts = (args.description as string).split(/[,，]/).map((s: string) => s.trim());

      const data = await lotteryStore.read();
      const lottery = {
        id: Date.now().toString(36),
        groupId: String(e.group_id),
        creatorId: String(e.user_id),
        description: parts[0] || '抽奖',
        prizeCount: parseInt(parts[1]) || 1,
        minPoints: parseInt(parts[2]) || 0,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        participants: [],
        winners: [],
        closed: false,
      };
      data.lotteries.push(lottery);
      await lotteryStore.write(data);

      return `抽奖：${lottery.description} | 奖品数量：${lottery.prizeCount} | ID: ${lottery.id} | 回复 "参与抽奖 ${lottery.id}" 参与`;
    },
  });

  ctx.registerCommand({
    name: '参与抽奖',
    aliases: ['参与抽奖', 'joinlottery'],
    prefix,
    args: [{ name: 'lotteryId', type: 'string', required: true }],
    permission: 'all',
    cooldown: 5,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const data = await lotteryStore.read();
      const lottery = data.lotteries.find((l) => l.id === String(args.lotteryId) && !l.closed);
      if (!lottery) return '抽奖不存在或已结束';
      if (lottery.participants.includes(String(e.user_id))) return '已参与';
      lottery.participants.push(String(e.user_id));
      await lotteryStore.write(data);
      return `参与成功，当前参与人数：${lottery.participants.length}`;
    },
  });

  ctx.registerCommand({
    name: '开奖',
    aliases: ['开奖', 'drawlottery'],
    prefix,
    args: [{ name: 'lotteryId', type: 'string', required: true }],
    permission: 'group_admin',
    cooldown: 10,
    handler: async (event, args) => {
      const data = await lotteryStore.read();
      const lottery = data.lotteries.find((l) => l.id === String(args.lotteryId) && !l.closed);
      if (!lottery) return '抽奖不存在或已结束';
      if (lottery.participants.length === 0) return '无人参与';

      const winners: string[] = [];
      const pool = [...lottery.participants];
      for (let i = 0; i < Math.min(lottery.prizeCount, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      lottery.winners = winners;
      lottery.closed = true;
      await lotteryStore.write(data);

      return `开奖结果：${winners.join(', ')}`;
    },
  });

  ctx.registerCommand({
    name: '问答',
    aliases: ['问', 'ask', 'qa', 'w'],
    prefix,
    args: [{ name: 'keyword', type: 'rest', required: true }],
    permission: 'all',
    cooldown: 3,
    handler: async (_event, args) => {
      const keyword = String(args.keyword).trim();
      const qaCfg = config.get<AppConfig['social']>('social').qa;
      if (!qaCfg.enabled) return null;

      const data = await qaStore.read();
      const matches = data.entries.filter((entry) => {
        if (entry.matchMode === 'exact') {
          return entry.keywords.some((kw) => kw === keyword);
        }
        return entry.keywords.some((kw) => keyword.includes(kw) || kw.includes(keyword));
      });

      if (matches.length === 0) return null;
      return matches[0].answer;
    },
  });

  ctx.registerCommand({
    name: 'AI语音',
    aliases: ['ai语音', 'aivoice', 'aiyy'],
    prefix,
    args: [{ name: 'text', type: 'rest', required: true }],
    permission: 'all',
    cooldown: config.get<AppConfig['social']>('social').aiVoice.cooldown,
    handler: async (event, args) => {
      const e = event as GroupMessageEvent;
      const aiCfg = config.get<AppConfig['social']>('social').aiVoice;
      if (!aiCfg.enabled) return 'AI语音功能未启用';
      if (!aiCfg.defaultCharacter) return '请先配置默认AI角色';

      await api.sendGroupAiRecord(aiCfg.defaultCharacter, e.group_id, String(args.text));
      return null;
    },
  });

  ctx.registerCommand({
    name: '问答管理',
    aliases: ['问答', 'qamanage', 'wd'],
    prefix,
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'rest', type: 'rest', required: false },
    ],
    permission: 'admin',
    cooldown: 3,
    handler: async (_event, args) => {
      const action = String(args.action);
      const data = await qaStore.read();
      const qaEntries = data.entries;

      if (action === '列表' || action === 'list') {
        if (qaEntries.length === 0) return '暂无问答条目';
        return qaEntries.map((q, i) => `${i + 1}. [${q.keywords.join(',')}] => ${q.answer}`).join('\n');
      }

      if (action === '添加' || action === 'add') {
        const rest = String(args.rest || '');
        const sepIdx = rest.indexOf('|');
        if (sepIdx === -1) return '用法: /问答 添加 关键词1,关键词2|回答内容';
        const kw = rest.slice(0, sepIdx).split(',').map((k) => k.trim()).filter(Boolean);
        const answer = rest.slice(sepIdx + 1).trim();
        if (!kw.length || !answer) return '关键词和回答不能为空';
        qaEntries.push({ id: Date.now().toString(36), keywords: kw, answer, matchMode: 'keyword', groupId: '*' });
        await qaStore.write(data);
        return `问答已添加: [${kw.join(',')}] => ${answer}`;
      }

      if (action === '删除' || action === 'del') {
        const idx = Number(args.rest) - 1;
        if (isNaN(idx) || idx < 0 || idx >= qaEntries.length) return '无效的序号';
        const removed = qaEntries.splice(idx, 1)[0];
        await qaStore.write(data);
        return `已删除问答: [${removed.keywords.join(',')}]`;
      }

      return '用法: /问答 列表|添加|删除';
    },
  });
}
