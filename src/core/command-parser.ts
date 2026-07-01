export interface ArgDef {
  name: string;
  type: 'string' | 'number' | 'user' | 'rest';
  required: boolean;
}

export type CommandHandler = (event: unknown, args: Record<string, string | number>) => Promise<string | null>;

export interface CommandDef {
  name: string;
  aliases: string[];
  prefix: string;
  args: ArgDef[];
  permission: 'admin' | 'group_admin' | 'all';
  cooldown: number;
  handler: CommandHandler;
}

export interface ParsedCommand {
  name: string;
  moduleId: string;
  args: Record<string, string | number>;
  rawArgs: string;
  handler: CommandHandler;
}

interface CommandEntry {
  moduleId: string;
  def: CommandDef;
}

export class CommandParser {
  private commands: CommandEntry[] = [];
  private cooldowns: Map<string, Map<string, number>> = new Map();

  register(moduleId: string, command: CommandDef): void {
    this.commands.push({ moduleId, def: command });
  }

  unregister(moduleId: string): void {
    this.commands = this.commands.filter((c) => c.moduleId !== moduleId);
  }

  parse(rawMessage: string): ParsedCommand | null {
    const trimmed = rawMessage.trim();
    if (!trimmed) return null;

    for (const entry of this.commands) {
      const { def } = entry;
      const prefix = def.prefix;

      let matchedAlias: string | null = null;

      for (const alias of def.aliases) {
        const fullPrefix = prefix + alias;
        if (trimmed === fullPrefix || trimmed.startsWith(fullPrefix + ' ')) {
          matchedAlias = alias;
          break;
        }
      }

      if (!matchedAlias) continue;

      const fullPrefix = prefix + matchedAlias;
      const argsStr = trimmed === fullPrefix ? '' : trimmed.slice(fullPrefix.length + 1);

      const args = this.parseArgs(argsStr, def.args);
      if (args === null) continue;

      return {
        name: def.name,
        moduleId: entry.moduleId,
        args,
        rawArgs: argsStr,
        handler: def.handler,
      };
    }

    return null;
  }

  checkCooldown(commandName: string, userId: string, cooldownSeconds: number): boolean {
    const now = Date.now();
    const userCooldowns = this.cooldowns.get(commandName);

    if (!userCooldowns) {
      const newMap = new Map<string, number>();
      newMap.set(userId, now);
      this.cooldowns.set(commandName, newMap);
      return true;
    }

    const lastUsed = userCooldowns.get(userId);
    if (lastUsed && now - lastUsed < cooldownSeconds * 1000) {
      return false;
    }

    userCooldowns.set(userId, now);
    return true;
  }

  getCommands(): { moduleId: string; def: CommandDef }[] {
    return [...this.commands];
  }

  private parseArgs(
    rawArgs: string,
    defs: ArgDef[]
  ): Record<string, string | number> | null {
    const result: Record<string, string | number> = {};
    const parts = this.splitArgs(rawArgs);

    let partIndex = 0;
    for (const def of defs) {
      if (def.type === 'rest') {
        result[def.name] = parts.slice(partIndex).join(' ');
        return result;
      }

      if (partIndex >= parts.length) {
        if (def.required) return null;
        continue;
      }

      const value = parts[partIndex];

      switch (def.type) {
        case 'string':
          result[def.name] = value;
          break;
        case 'number':
          const num = Number(value);
          if (isNaN(num)) return null;
          result[def.name] = num;
          break;
        case 'user':
          const match = value.match(/\[CQ:at,qq=(\d+)\]/);
          result[def.name] = match ? match[1] : value.replace(/\D/g, '');
          break;
      }

      partIndex++;
    }

    return result;
  }

  private splitArgs(input: string): string[] {
    if (!input) return [];
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ' ' && !inQuote) {
        if (current) { parts.push(current); current = ''; }
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);
    return parts;
  }
}
