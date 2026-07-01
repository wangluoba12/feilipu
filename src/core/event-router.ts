import type { AnyEvent } from '../types/events';
import { log } from '../infra/logger';

export type EventHandler = (event: AnyEvent) => Promise<void>;

interface EventHandlerEntry {
  id: string;
  moduleId: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
}

export class EventRouter {
  private handlers: EventHandlerEntry[] = [];
  private groupQueues: Map<string, AnyEvent[]> = new Map();
  private processing: Map<string, boolean> = new Map();

  register(moduleId: string, eventType: string, handler: EventHandler, priority: number = 100): void {
    const id = `${moduleId}_${eventType}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.handlers.push({ id, moduleId, eventType, handler, priority });
    this.handlers.sort((a, b) => a.priority - b.priority);

    log.debug(`Event handler registered`, { moduleId, eventType, priority });
  }

  async dispatch(event: AnyEvent): Promise<void> {
    const eventType = this.buildEventType(event);

    const matched = this.handlers.filter((h) => h.eventType === eventType || h.eventType === '*');
    if (matched.length === 0) return;

    const groupId = (event as Record<string, unknown>).group_id as string | undefined;
    if (groupId && eventType === 'message.group') {
      await this.serializeGroupEvent(groupId, event, matched);
    } else {
      await this.runHandlers(event, matched);
    }
  }

  unregister(moduleId: string): void {
    const before = this.handlers.length;
    this.handlers = this.handlers.filter((h) => h.moduleId !== moduleId);
    log.info(`Event handlers unregistered for module: ${moduleId}, removed ${before - this.handlers.length}`);
  }

  getHandlerCount(): number {
    return this.handlers.length;
  }

  private async serializeGroupEvent(
    groupId: string,
    event: AnyEvent,
    matched: EventHandlerEntry[]
  ): Promise<void> {
    if (this.processing.get(groupId)) {
      const queue = this.groupQueues.get(groupId) || [];
      queue.push(event);
      this.groupQueues.set(groupId, queue);
      return;
    }

    this.processing.set(groupId, true);

    try {
      await this.runHandlers(event, matched);
    } finally {
      const queue = this.groupQueues.get(groupId);
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) {
          this.groupQueues.delete(groupId);
        }
        this.processing.set(groupId, false);
        await this.serializeGroupEvent(groupId, next, matched);
      } else {
        this.processing.delete(groupId);
      }
    }
  }

  private async runHandlers(event: AnyEvent, entries: EventHandlerEntry[]): Promise<void> {
    for (const entry of entries) {
      try {
        await entry.handler(event);
      } catch (err) {
        log.error(`Handler error`, {
          moduleId: entry.moduleId,
          eventType: entry.eventType,
          error: String(err),
        });
      }
    }
  }

  private buildEventType(event: AnyEvent): string {
    const postType = event.post_type;

    if (postType === 'message') {
      return `${postType}.${(event as Record<string, string>).message_type}`;
    }
    if (postType === 'notice') {
      const noticeType = (event as Record<string, string>).notice_type;
      if (noticeType === 'notify') {
        return `notice.notify.${(event as Record<string, string>).sub_type}`;
      }
      return `notice.${noticeType}`;
    }
    if (postType === 'request') {
      const reqType = (event as Record<string, string>).request_type;
      const subType = (event as Record<string, string>).sub_type;
      return subType ? `request.${reqType}.${subType}` : `request.${reqType}`;
    }
    if (postType === 'meta_event') {
      return `meta_event.${(event as Record<string, string>).meta_event_type}`;
    }

    return postType;
  }
}
