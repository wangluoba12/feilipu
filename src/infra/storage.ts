import { readFile, writeFile, rename, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { log } from './logger';

export class JsonStorage<T extends object> {
  private filePath: string;
  private defaults: T;
  private cache: T | null = null;

  constructor(filePath: string, defaults: T) {
    this.filePath = filePath;
    this.defaults = defaults;
  }

  async read(): Promise<T> {
    if (this.cache) return this.cache;

    try {
      await access(this.filePath);
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.cache = this.mergeDefaults(parsed, this.defaults);
      return this.cache;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        log.warn(`Storage file not found, creating with defaults: ${this.filePath}`);
        await this.write(this.defaults);
        this.cache = { ...this.defaults } as T;
        return this.cache;
      }
      log.error(`Failed to read storage file, using defaults: ${this.filePath}`, { error: String(err) });
      this.cache = { ...this.defaults } as T;
      return this.cache;
    }
  }

  async write(data: T): Promise<void> {
    const tmpPath = `${this.filePath}.tmp`;
    const dir = dirname(this.filePath);

    await mkdir(dir, { recursive: true });

    const json = JSON.stringify(data, null, 2);
    await writeFile(tmpPath, json, 'utf-8');
    await rename(tmpPath, this.filePath);

    this.cache = { ...data } as T;
  }

  async update(patch: Partial<T>): Promise<void> {
    const current = await this.read();

    if (typeof current !== 'object' || current === null) {
      throw new Error('Cannot update non-object storage');
    }

    const merged = { ...current, ...patch } as T;
    await this.write(merged);
  }

  invalidateCache(): void {
    this.cache = null;
  }

  private mergeDefaults(fetched: unknown, fallback: T): T {
    if (typeof fetched !== 'object' || fetched === null) return { ...fallback } as unknown as T;
    if (typeof fallback !== 'object' || fallback === null) return fetched as unknown as T;

    const result = { ...fetched as Record<string, unknown> };
    const fallbackObj = fallback as Record<string, unknown>;
    for (const key of Object.keys(fallbackObj)) {
      if (!(key in result) || result[key] === undefined) {
        result[key] = fallbackObj[key];
      } else if (
        typeof fallbackObj[key] === 'object' &&
        fallbackObj[key] !== null &&
        !Array.isArray(fallbackObj[key])
      ) {
        result[key] = this.deepMerge(result[key], fallbackObj[key]);
      }
    }
    return result as unknown as T;
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return target;

    const result = { ...target as Record<string, unknown> };
    const sourceObj = source as Record<string, unknown>;
    for (const key of Object.keys(sourceObj)) {
      if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null && !Array.isArray(sourceObj[key])) {
        result[key] = this.deepMerge(result[key], sourceObj[key]);
      } else if (!(key in result)) {
        result[key] = sourceObj[key];
      }
    }
    return result;
  }
}
