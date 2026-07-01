export type OneBotEventType =
  | 'message'
  | 'notice'
  | 'request'
  | 'meta_event';

export type MessageEventType = 'message.private' | 'message.group';
export type NoticeEventType =
  | 'notice.notify'
  | 'notice.group_increase'
  | 'notice.group_decrease'
  | 'notice.group_ban'
  | 'notice.group_admin'
  | 'notice.group_upload'
  | 'notice.friend_add';
export type RequestEventType = 'request.friend' | 'request.group.add' | 'request.group.invite';
export type MetaEventType = 'meta_event.lifecycle' | 'meta_event.heartbeat';

export type AllEventType =
  | MessageEventType
  | NoticeEventType
  | RequestEventType
  | MetaEventType;

export interface OneBotEvent {
  time: number;
  self_id: number;
  post_type: OneBotEventType;
  [key: string]: unknown;
}

export interface BaseMessageEvent extends OneBotEvent {
  post_type: 'message';
  message_type: 'private' | 'group';
  sub_type: string;
  message_id: number;
  user_id: number;
  message: MessageSegment[];
  raw_message: string;
  font: number;
  sender: MessageSender;
}

export interface PrivateMessageEvent extends BaseMessageEvent {
  message_type: 'private';
  sub_type: 'friend' | 'group' | 'other';
  temp_source?: number;
}

export interface GroupMessageEvent extends BaseMessageEvent {
  message_type: 'group';
  group_id: number;
  anonymous?: Anonymous;
}

export interface MessageSender {
  user_id: number;
  nickname: string;
  sex: string;
  age: number;
  card?: string;
  area?: string;
  level?: string;
  role?: 'owner' | 'admin' | 'member';
  title?: string;
}

export interface Anonymous {
  id: number;
  name: string;
  flag: string;
}

export type MessageSegment =
  | MessageSegmentText
  | MessageSegmentFace
  | MessageSegmentImage
  | MessageSegmentRecord
  | MessageSegmentVideo
  | MessageSegmentAt
  | MessageSegmentReply
  | MessageSegmentForward
  | MessageSegmentNode
  | MessageSegmentJson
  | MessageSegmentXml
  | MessageSegmentPoke
  | MessageSegmentFile
  | MessageSegmentMarkdown
  | MessageSegmentKeyboard;

export interface MessageSegmentText {
  type: 'text';
  data: { text: string };
}

export interface MessageSegmentFace {
  type: 'face';
  data: { id: string };
}

export interface MessageSegmentImage {
  type: 'image';
  data: { file: string; url?: string; type?: string; subType?: number };
}

export interface MessageSegmentRecord {
  type: 'record';
  data: { file: string; url?: string };
}

export interface MessageSegmentVideo {
  type: 'video';
  data: { file: string; url?: string };
}

export interface MessageSegmentAt {
  type: 'at';
  data: { qq: string | 'all'; name?: string };
}

export interface MessageSegmentReply {
  type: 'reply';
  data: { id: string };
}

export interface MessageSegmentForward {
  type: 'forward';
  data: { id: string };
}

export interface MessageSegmentNode {
  type: 'node';
  data: {
    id?: string;
    user_id?: number;
    nickname?: string;
    content?: MessageSegment[];
  };
}

export interface MessageSegmentJson {
  type: 'json';
  data: { data: string };
}

export interface MessageSegmentXml {
  type: 'xml';
  data: { data: string };
}

export interface MessageSegmentPoke {
  type: 'poke';
  data: { type: string; id: string; name?: string };
}

export interface MessageSegmentFile {
  type: 'file';
  data: { file: string; name?: string; size?: number };
}

export interface MessageSegmentMarkdown {
  type: 'markdown';
  data: { content: string };
}

export interface MessageSegmentKeyboard {
  type: 'keyboard';
  data: { content: string };
}

export interface BaseNoticeEvent extends OneBotEvent {
  post_type: 'notice';
  notice_type: string;
}

export interface PokeNotifyEvent extends BaseNoticeEvent {
  notice_type: 'notify';
  sub_type: 'poke';
  group_id?: number;
  user_id: number;
  target_id: number;
}

export interface GroupCardNotifyEvent extends BaseNoticeEvent {
  notice_type: 'notify';
  sub_type: 'group_card';
  group_id: number;
  user_id: number;
  card_new: string;
  card_old: string;
}

export interface GroupIncreaseEvent extends BaseNoticeEvent {
  notice_type: 'group_increase';
  sub_type: 'approve' | 'invite';
  group_id: number;
  operator_id: number;
  user_id: number;
}

export interface GroupDecreaseEvent extends BaseNoticeEvent {
  notice_type: 'group_decrease';
  sub_type: 'leave' | 'kick' | 'kick_me';
  group_id: number;
  operator_id: number;
  user_id: number;
}

export interface GroupBanEvent extends BaseNoticeEvent {
  notice_type: 'group_ban';
  sub_type: 'ban' | 'lift_ban';
  group_id: number;
  operator_id: number;
  user_id: number;
  duration: number;
}

export interface GroupAdminEvent extends BaseNoticeEvent {
  notice_type: 'group_admin';
  sub_type: 'set' | 'unset';
  group_id: number;
  user_id: number;
}

export interface GroupUploadEvent extends BaseNoticeEvent {
  notice_type: 'group_upload';
  group_id: number;
  user_id: number;
  file: {
    id: string;
    name: string;
    size: number;
    busid: number;
  };
}

export interface FriendAddEvent extends BaseNoticeEvent {
  notice_type: 'friend_add';
  user_id: number;
}

export type NoticeEvent =
  | PokeNotifyEvent
  | GroupCardNotifyEvent
  | GroupIncreaseEvent
  | GroupDecreaseEvent
  | GroupBanEvent
  | GroupAdminEvent
  | GroupUploadEvent
  | FriendAddEvent;

export interface BaseRequestEvent extends OneBotEvent {
  post_type: 'request';
  request_type: string;
}

export interface FriendRequestEvent extends BaseRequestEvent {
  request_type: 'friend';
  user_id: number;
  comment: string;
  flag: string;
}

export interface GroupAddRequestEvent extends BaseRequestEvent {
  request_type: 'group';
  sub_type: 'add';
  group_id: number;
  user_id: number;
  comment: string;
  flag: string;
}

export interface GroupInviteRequestEvent extends BaseRequestEvent {
  request_type: 'group';
  sub_type: 'invite';
  group_id: number;
  user_id: number;
  comment: string;
  flag: string;
}

export type RequestEvent = FriendRequestEvent | GroupAddRequestEvent | GroupInviteRequestEvent;

export interface LifecycleEvent extends OneBotEvent {
  post_type: 'meta_event';
  meta_event_type: 'lifecycle';
  sub_type: 'enable' | 'disable' | 'connect';
}

export interface HeartbeatEvent extends OneBotEvent {
  post_type: 'meta_event';
  meta_event_type: 'heartbeat';
  status: {
    app_initialized: boolean;
    app_enabled: boolean;
    app_good: boolean;
    online: boolean;
    good: boolean;
    stat?: Record<string, number>;
  };
  interval: number;
}

export type MetaEvent = LifecycleEvent | HeartbeatEvent;

export type AnyEvent =
  | PrivateMessageEvent
  | GroupMessageEvent
  | NoticeEvent
  | RequestEvent
  | MetaEvent;

export interface ForwardNode {
  user_id: number;
  nickname: string;
  content: MessageSegment[];
}
