import type { MessageSegment } from './events';

export interface ApiResponse<T = unknown> {
  status: 'ok' | 'failed';
  retcode: number;
  data: T;
  msg: string;
  wording: string;
  echo?: string;
}

export interface ApiRequest {
  action: string;
  params: Record<string, unknown>;
  echo?: string;
}

export interface GroupInfo {
  group_id: number;
  group_name: string;
  group_memo: string;
  group_create_time: number;
  group_level: number;
  member_count: number;
  max_member_count: number;
}

export interface GroupMemberInfo {
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  sex: string;
  age: number;
  area: string;
  join_time: number;
  last_sent_time: number;
  level: string;
  role: 'owner' | 'admin' | 'member';
  unfriendly: boolean;
  title: string;
  title_expire_time: number;
  card_changeable: boolean;
}

export interface FriendInfo {
  user_id: number;
  nickname: string;
  remark: string;
}

export interface MessageInfo {
  message_id: number;
  real_id: number;
  sender: {
    user_id: number;
    nickname: string;
    sex: string;
    age: number;
  };
  time: number;
  message: MessageSegment[];
  raw_message: string;
}

export interface ForwardNode {
  user_id: number;
  nickname: string;
  content: MessageSegment[];
}

export interface ForwardResult {
  message_id: number;
  res_id: string;
}

export interface ArkShareResult {
  errCode: number;
  errMsg: string;
  arkJson: string;
}

export interface RobotUinRange {
  minUin: number;
  maxUin: number;
}

export interface FriendCategory {
  categoryId: number;
  categorySortId: number;
  categoryName: string;
  categoryMbCount: number;
  onlineCount: number;
  buddyList: BuddyInfo[];
}

export interface BuddyInfo {
  qid: string;
  longNick: string;
  birthday_year: number;
  birthday_month: number;
  birthday_day: number;
  age: number;
  sex: string;
  eMail: string;
  phoneNum: string;
  categoryId: number;
  richTime: number;
  uid: string;
  uin: string;
  nick: string;
  remark: string;
  user_id: number;
  nickname: string;
  level: number;
}

export interface FileInfo {
  file: string;
  url: string;
  file_size: string;
  file_name: string;
  base64: string;
}

export interface ProfileLikeData {
  total_count: number;
  new_count: number;
  new_nearby_count: number;
  last_visit_time: number;
  userInfos: LikeUserInfo[];
}

export interface LikeUserInfo {
  uid: string;
  src: number;
  latestTime: number;
  count: number;
  giftCount: number;
  customId: number;
  lastCharged: number;
  bAvailableCnt: number;
  bTodayVotedCnt: number;
  nick: string;
  gender: number;
  age: number;
  isFriend: boolean;
  isvip: boolean;
  isSvip: boolean;
  uin: number;
}

export interface AiCharacter {
  character_id: string;
  character_name: string;
  preview_url: string;
}

export interface AiCharacterGroup {
  type: string;
  characters: AiCharacter[];
}

export interface RecentContact {
  lastestMsg: MessageInfo;
  peerUin: number;
  remark: string;
  msgTime: string;
  chatType: number;
  msgId: string;
  sendNickName: string;
  sendMemberName: string;
  peerName: string;
}

export interface CollectionInfo {
  cid: number;
  type: number;
  title: string;
  createTime: number;
  modifyTime: number;
  content: string;
  summary: string;
  source: string;
  sourceUrl: string;
  busiData: string;
}

export interface GroupHonorInfo {
  group_id: number;
  current_talkative: {
    user_id: number;
    nickname: string;
    avatar: string;
    day_count: number;
  };
  talkative_list: {
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }[];
  performer_list: {
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }[];
  legend_list: {
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }[];
  strong_newbie_list: {
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }[];
  emotion_list: {
    user_id: number;
    nickname: string;
    avatar: string;
    description: string;
  }[];
}

export interface LoginInfo {
  user_id: number;
  nickname: string;
}

export interface StrangerInfo {
  user_id: number;
  nickname: string;
  sex: string;
  age: number;
  qid: string;
  level: number;
  login_days: number;
}

export interface CookiesInfo {
  cookies: string;
  bkn: number;
}

export interface CsrfTokenInfo {
  token: string;
}

export interface CredentialsInfo {
  cookies: string;
  bkn: number;
  token: string;
}

export interface VersionInfo {
  app_name: string;
  app_version: string;
  protocol_version: string;
  extra: Record<string, string>;
}

export interface StatusInfo {
  app_initialized: boolean;
  app_enabled: boolean;
  app_good: boolean;
  online: boolean;
  good: boolean;
}

export interface ImageInfo {
  file?: string;
  url?: string;
  file_size?: string;
  width?: number;
  height?: number;
  type?: string;
  subType?: number;
}

export interface RecordInfo {
  file?: string;
  url?: string;
  file_size?: string;
  type?: string;
}

export interface EssenceMsgInfo {
  sender_id: number;
  sender_nick: string;
  sender_time: number;
  operator_id: number;
  operator_nick: string;
  operator_time: number;
}

export interface ModelShowInfo {
  variety_show: boolean;
  model_id: number;
  model_show: string;
}

export interface OCImageResult {
  texts: {
    text: string;
    confidence: number;
    coordinates: number[][];
  }[];
  language: string;
}
