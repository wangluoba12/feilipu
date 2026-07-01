import type { ArgDef, CommandDef } from './command-parser';
import type { EventHandler } from './event-router';
import { log } from '../infra/logger';

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  load: () => Promise<void>;
  unload: () => Promise<void>;
}

export interface ModuleStatus {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}

export interface ModuleCtx {
  registerEvent: (eventType: string, handler: EventHandler, priority?: number) => void;
  registerCommand: (command: CommandDef) => void;
  isAdmin: (userId: string) => boolean;
}

export class ModuleLoader {
  private modules: Map<string, { manifest: ModuleManifest; loaded: boolean }> = new Map();

  register(manifest: ModuleManifest): void {
    this.modules.set(manifest.id, { manifest, loaded: false });
  }

  async loadAll(): Promise<void> {
    for (const [id, entry] of this.modules) {
      if (entry.manifest.enabled && !entry.loaded) {
        try {
          await this.loadModule(id);
        } catch (err) {
          log.error(`Failed to load module: ${id}`, { error: String(err) });
          entry.loaded = false;
        }
      }
    }
  }

  async loadModule(id: string): Promise<void> {
    const entry = this.modules.get(id);
    if (!entry) throw new Error(`Module not found: ${id}`);

    await entry.manifest.load();
    entry.loaded = true;
    log.info(`Module loaded: ${id}`);
  }

  async unloadModule(id: string): Promise<void> {
    const entry = this.modules.get(id);
    if (!entry) throw new Error(`Module not found: ${id}`);
    if (!entry.loaded) return;

    await entry.manifest.unload();
    entry.loaded = false;
    log.info(`Module unloaded: ${id}`);
  }

  async reloadModule(id: string): Promise<void> {
    await this.unloadModule(id);
    await this.loadModule(id);
    log.info(`Module reloaded: ${id}`);
  }

  getModuleStatus(): ModuleStatus[] {
    const result: ModuleStatus[] = [];
    for (const [, entry] of this.modules) {
      result.push({
        id: entry.manifest.id,
        name: entry.manifest.name,
        version: entry.manifest.version,
        enabled: entry.manifest.enabled,
        loaded: entry.loaded,
      });
    }
    return result;
  }
}
