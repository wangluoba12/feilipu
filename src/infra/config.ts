import { JsonStorage } from './storage';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';
import { log } from './logger';
import { pluginState } from '../core/state';

export class ConfigManager {
  private storage: JsonStorage<AppConfig> | null;
  private memoryConfig: AppConfig | null = null;

  constructor(dataDir: string) {
    this.storage = new JsonStorage<AppConfig>(
      `${dataDir}/config.json`,
      DEFAULT_CONFIG
    );
  }

  static fromObject(config: AppConfig): ConfigManager {
    const mgr = new ConfigManager('');
    mgr.storage = null;
    mgr.memoryConfig = config;
    return mgr;
  }

  async init(): Promise<void> {
    if (this.storage) {
      await this.storage.read();
      log.info('ConfigManager initialized');
    }
  }

  get<T>(path: string): T {
    const conf = this.memoryConfig || this.storage?.['cache'];
    if (!conf) throw new Error('Config not loaded. Call init() first.');

    if (pluginState.ctx) {
      const napcatConfig = pluginState.config as unknown as Record<string, unknown>;
      if (napcatConfig && Object.keys(napcatConfig).length > 0) {
        return this.getValueByPath(napcatConfig, path) as T;
      }
    }

    return this.getValueByPath(conf as unknown as Record<string, unknown>, path) as T;
  }

  async set<T>(path: string, value: T): Promise<void> {
    if (pluginState.ctx) {
      const napcatConfig = { ...(pluginState.config as unknown as Record<string, unknown>) };
      this.setValueByPath(napcatConfig, path, value);
      pluginState.config = napcatConfig;
      return;
    }

    if (this.storage) {
      const config = await this.storage.read();
      this.setValueByPath(config as unknown as Record<string, unknown>, path, value);
      await this.storage.write(config);
    } else if (this.memoryConfig) {
      this.setValueByPath(this.memoryConfig as unknown as Record<string, unknown>, path, value);
    }
  }

  getAll(): AppConfig {
    if (pluginState.ctx && Object.keys(pluginState.config as Record<string, unknown>).length > 0) {
      return pluginState.config as unknown as AppConfig;
    }

    const config = this.memoryConfig || this.storage?.['cache'];
    if (!config) throw new Error('Config not loaded. Call init() first.');
    return config;
  }

  exportConfig(): string {
    const config = this.memoryConfig || this.storage?.['cache'];
    if (!config) throw new Error('Config not loaded. Call init() first.');
    return JSON.stringify(config, null, 2);
  }

  async importConfig(json: string): Promise<void> {
    try {
      const parsed = JSON.parse(json) as AppConfig;
      if (this.storage) {
        await this.storage.write(parsed);
      } else if (this.memoryConfig !== null) {
        this.memoryConfig = parsed;
      }
      log.info('Config imported successfully');
    } catch (err) {
      log.error('Failed to import config', { error: String(err) });
      throw new Error('Invalid config JSON');
    }
  }

  async reset(path?: string): Promise<void> {
    if (path) {
      const defaultValue = this.getValueByPath(DEFAULT_CONFIG as unknown as Record<string, unknown>, path);
      await this.set(path, defaultValue);
    } else {
      if (this.storage) {
        await this.storage.write({ ...DEFAULT_CONFIG } as AppConfig);
      } else if (this.memoryConfig !== null) {
        this.memoryConfig = { ...DEFAULT_CONFIG };
      }
    }
    log.info(`Config reset: ${path || 'all'}`);
  }

  getStorage(): JsonStorage<AppConfig> | null {
    return this.storage;
  }

  private getValueByPath(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
}
