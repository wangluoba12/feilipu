export interface NapCatPluginContext {
  core: unknown;
  oneBot: unknown;
  actions: { call(actionName: string, params: unknown, adapter: string, config: unknown): Promise<unknown> };
  pluginName: string;
  pluginPath: string;
  configPath: string;
  dataPath: string;
  NapCatConfig: unknown;
  adapterName: string;
  pluginManager: {
    config: unknown;
    getPluginPath(): string;
    getPluginConfig(): Record<string, unknown>;
  };
  logger: PluginLogger;
  router: PluginRouterRegistry;
  getPluginExports<T = unknown>(pluginId: string): T | undefined;
}

export interface PluginLogger {
  (...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface PluginRouterRegistry {
  get(path: string, handler: PluginRequestHandler): void;
  post(path: string, handler: PluginRequestHandler): void;
  put(path: string, handler: PluginRequestHandler): void;
  delete(path: string, handler: PluginRequestHandler): void;
  getNoAuth(path: string, handler: PluginRequestHandler): void;
  postNoAuth(path: string, handler: PluginRequestHandler): void;
  page(page: PluginPageDefinition): void;
  static(urlPath: string, localPath: string): void;
}

export interface PluginHttpRequest {
  path: string;
  method: string;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

export interface PluginHttpResponse {
  status(code: number): PluginHttpResponse;
  json(data: unknown): void;
  send(data: string | Buffer): void;
  setHeader(name: string, value: string): PluginHttpResponse;
}

export interface PluginPageDefinition {
  path: string;
  title: string;
  icon?: string;
  htmlFile: string;
  description?: string;
}

export type PluginRequestHandler = (
  req: PluginHttpRequest,
  res: PluginHttpResponse
) => void | Promise<void>;

export interface PluginModule {
  plugin_init: (ctx: NapCatPluginContext) => void | Promise<void>;
  plugin_onmessage?: (ctx: NapCatPluginContext, event: OB11MessageEvent) => void | Promise<void>;
  plugin_cleanup?: (ctx: NapCatPluginContext) => void | Promise<void>;
  plugin_config_ui?: PluginConfigSchema;
  plugin_get_config?: (ctx: NapCatPluginContext) => unknown | Promise<unknown>;
  plugin_set_config?: (ctx: NapCatPluginContext, config: unknown) => void | Promise<void>;
}

export type PluginConfigSchema = PluginConfigItem[];

export interface PluginConfigItem {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select' | 'html' | 'text';
  label: string;
  description?: string;
  default?: unknown;
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  reactive?: boolean;
  hidden?: boolean;
}

export interface OB11MessageEvent {
  post_type: 'message' | 'notice' | 'request' | 'meta_event';
  message_type?: 'group' | 'private';
  sub_type?: string;
  message_id: number;
  user_id: number;
  group_id?: number;
  message: OB11MessageSegment[];
  raw_message: string;
  sender: {
    user_id: number;
    nickname: string;
    card?: string;
    role?: 'owner' | 'admin' | 'member';
  };
  time: number;
  self_id: number;
  font: number;
  notice_type?: string;
  request_type?: string;
}

export interface OB11MessageSegment {
  type: string;
  data: Record<string, unknown>;
}
