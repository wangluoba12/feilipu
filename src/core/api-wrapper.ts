import { pluginState } from './state';
import type {
  MessageSegment,
  ForwardNode,
} from '../types/events';
import type {
  ApiResponse,
  GroupInfo,
  GroupMemberInfo,
  FriendInfo,
  MessageInfo,
  ForwardResult,
  ArkShareResult,
  RobotUinRange,
  FriendCategory,
  FileInfo,
  ProfileLikeData,
  AiCharacterGroup,
  RecentContact,
  CollectionInfo,
  GroupHonorInfo,
  LoginInfo,
  StrangerInfo,
  VersionInfo,
  StatusInfo,
  ImageInfo,
  RecordInfo,
  ModelShowInfo,
} from '../types/api';

export type NapCatApiCall = (action: string, params: Record<string, unknown>) => Promise<ApiResponse>;

export class ApiWrapper {
  private botApi: NapCatApiCall | null;

  constructor(botApi?: NapCatApiCall) {
    this.botApi = botApi || null;
  }

  private async call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response: { status: string; retcode: number; data: T; wording?: string; msg?: string };

        if (pluginState.ctx) {
          response = await pluginState.ctx.actions.call(
            action, params,
            pluginState.ctx.adapterName,
            pluginState.ctx.pluginManager.config
          ) as { status: string; retcode: number; data: T; wording?: string; msg?: string };
        } else if (this.botApi) {
          response = await this.botApi(action, params) as unknown as { status: string; retcode: number; data: T; wording?: string; msg?: string };
        } else {
          throw new Error('No API backend available');
        }

        if (response.status === 'ok' || response.retcode === 0) {
          return response.data;
        }
        lastError = new Error(`API error: ${response.wording || response.msg || String(response.retcode)}`);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    if (pluginState.ctx) {
      pluginState.ctx.logger.error(`API call failed after ${maxRetries} retries: ${action}`);
    }
    throw lastError;
  }

  async sendPrivateMsg(userId: number | string, message: MessageSegment[]): Promise<number> {
    const res = await this.call<{ message_id: number }>('send_private_msg', { user_id: Number(userId), message });
    return res.message_id;
  }

  async sendGroupMsg(groupId: number | string, message: MessageSegment[]): Promise<number> {
    const res = await this.call<{ message_id: number }>('send_group_msg', { group_id: Number(groupId), message });
    return res.message_id;
  }

  async sendMsg(messageType: 'private' | 'group', targetId: number | string, message: MessageSegment[]): Promise<number> {
    const res = await this.call<{ message_id: number }>('send_msg', {
      message_type: messageType,
      ...(messageType === 'private' ? { user_id: Number(targetId) } : { group_id: Number(targetId) }),
      message,
    });
    return res.message_id;
  }

  async deleteMsg(messageId: number): Promise<void> {
    await this.call('delete_msg', { message_id: messageId });
  }

  async getMsg(messageId: number): Promise<MessageInfo> {
    return this.call<MessageInfo>('get_msg', { message_id: messageId });
  }

  async getForwardMsg(messageId: string): Promise<MessageInfo> {
    return this.call<MessageInfo>('get_forward_msg', { message_id: messageId });
  }

  async sendLike(userId: number | string, times = 1): Promise<void> {
    await this.call('send_like', { user_id: Number(userId), times });
  }

  async setGroupKick(groupId: number | string, userId: number | string, rejectAddRequest = false): Promise<void> {
    await this.call('set_group_kick', { group_id: Number(groupId), user_id: Number(userId), reject_add_request: rejectAddRequest });
  }

  async setGroupBan(groupId: number | string, userId: number | string, duration = 1800): Promise<void> {
    await this.call('set_group_ban', { group_id: Number(groupId), user_id: Number(userId), duration });
  }

  async setGroupWholeBan(groupId: number | string, enable = true): Promise<void> {
    await this.call('set_group_whole_ban', { group_id: Number(groupId), enable });
  }

  async setGroupAdmin(groupId: number | string, userId: number | string, enable = true): Promise<void> {
    await this.call('set_group_admin', { group_id: Number(groupId), user_id: Number(userId), enable });
  }

  async setGroupSpecialTitle(groupId: number | string, userId: number | string, specialTitle: string): Promise<void> {
    await this.call('set_group_special_title', { group_id: Number(groupId), user_id: Number(userId), special_title: specialTitle });
  }

  async setGroupCard(groupId: number | string, userId: number | string, card: string): Promise<void> {
    await this.call('set_group_card', { group_id: Number(groupId), user_id: Number(userId), card });
  }

  async setGroupName(groupId: number | string, groupName: string): Promise<void> {
    await this.call('set_group_name', { group_id: Number(groupId), group_name: groupName });
  }

  async setGroupLeave(groupId: number | string, isDismiss = false): Promise<void> {
    await this.call('set_group_leave', { group_id: Number(groupId), is_dismiss: isDismiss });
  }

  async setGroupAddRequest(flag: string, subType: string, approve: boolean, reason = ''): Promise<void> {
    await this.call('set_group_add_request', { flag, sub_type: subType, approve, reason });
  }

  async setFriendAddRequest(flag: string, approve: boolean, remark = ''): Promise<void> {
    await this.call('set_friend_add_request', { flag, approve, remark });
  }

  async getGroupInfo(groupId: number | string, noCache = false): Promise<GroupInfo> {
    return this.call<GroupInfo>('get_group_info', { group_id: Number(groupId), no_cache: noCache });
  }

  async getGroupList(): Promise<GroupInfo[]> {
    return this.call<GroupInfo[]>('get_group_list');
  }

  async getGroupMemberInfo(groupId: number | string, userId: number | string, noCache = false): Promise<GroupMemberInfo> {
    return this.call<GroupMemberInfo>('get_group_member_info', { group_id: Number(groupId), user_id: Number(userId), no_cache: noCache });
  }

  async getGroupMemberList(groupId: number | string, noCache = false): Promise<GroupMemberInfo[]> {
    return this.call<GroupMemberInfo[]>('get_group_member_list', { group_id: Number(groupId), no_cache: noCache });
  }

  async getGroupHonorInfo(groupId: number | string, type = 'all'): Promise<GroupHonorInfo> {
    return this.call<GroupHonorInfo>('get_group_honor_info', { group_id: Number(groupId), type });
  }

  async getFriendList(): Promise<FriendInfo[]> {
    return this.call<FriendInfo[]>('get_friend_list');
  }

  async getStrangerInfo(userId: number | string, noCache = false): Promise<StrangerInfo> {
    return this.call<StrangerInfo>('get_stranger_info', { user_id: Number(userId), no_cache: noCache });
  }

  async getLoginInfo(): Promise<LoginInfo> {
    return this.call<LoginInfo>('get_login_info');
  }

  async canSendImage(): Promise<{ yes: boolean }> {
    return this.call('can_send_image');
  }

  async canSendRecord(): Promise<{ yes: boolean }> {
    return this.call('can_send_record');
  }

  async getStatus(): Promise<StatusInfo> {
    return this.call<StatusInfo>('get_status');
  }

  async getVersionInfo(): Promise<VersionInfo> {
    return this.call<VersionInfo>('get_version_info');
  }

  async getImage(file: string): Promise<ImageInfo> {
    return this.call<ImageInfo>('get_image', { file });
  }

  async getRecord(file: string, outFormat = 'mp3'): Promise<RecordInfo> {
    return this.call<RecordInfo>('get_record', { file, out_format: outFormat });
  }

  async setRestart(delay = 0): Promise<void> {
    await this.call('set_restart', { delay });
  }

  async cleanCache(): Promise<void> {
    await this.call('clean_cache');
  }

  async sendForwardMsg(
    messageType: string,
    userId: number | undefined,
    groupId: number | undefined,
    messages: ForwardNode[]
  ): Promise<ForwardResult> {
    const params: Record<string, unknown> = { messages };
    if (messageType === 'private' && userId) params.user_id = userId;
    else if (messageType === 'group' && groupId) params.group_id = groupId;
    return this.call<ForwardResult>('send_forward_msg', params);
  }

  async uploadPrivateFile(userId: number | string, file: string, name: string): Promise<void> {
    await this.call('upload_private_file', { user_id: Number(userId), file, name });
  }

  async uploadGroupFile(groupId: number | string, file: string, name: string, folder = ''): Promise<void> {
    await this.call('upload_group_file', { group_id: Number(groupId), file, name, folder });
  }

  async deleteGroupFile(groupId: number | string, fileId: string, busid: number): Promise<void> {
    await this.call('delete_group_file', { group_id: Number(groupId), file_id: fileId, busid });
  }

  async createGroupFileFolder(groupId: number | string, name: string): Promise<void> {
    await this.call('create_group_file_folder', { group_id: Number(groupId), name });
  }

  async getGroupFileSystemInfo(groupId: number | string): Promise<unknown> {
    return this.call('get_group_file_system_info', { group_id: Number(groupId) });
  }

  async getGroupRootFiles(groupId: number | string): Promise<unknown> {
    return this.call('get_group_root_files', { group_id: Number(groupId) });
  }

  async getGroupFilesByFolder(groupId: number | string, folderId: string): Promise<unknown> {
    return this.call('get_group_files_by_folder', { group_id: Number(groupId), folder_id: folderId });
  }

  async getGroupFileUrl(groupId: number | string, fileId: string, busid: number): Promise<string> {
    const res = await this.call<{ url: string }>('get_group_file_url', { group_id: Number(groupId), file_id: fileId, busid });
    return res.url;
  }

  async getEssenceMsgList(groupId: number | string): Promise<unknown> {
    return this.call('get_essence_msg_list', { group_id: Number(groupId) });
  }

  async setEssenceMsg(messageId: number): Promise<void> {
    await this.call('set_essence_msg', { message_id: messageId });
  }

  async deleteEssenceMsg(messageId: number): Promise<void> {
    await this.call('delete_essence_msg', { message_id: messageId });
  }

  async handleQuickOperation(context: Record<string, unknown>, operation: Record<string, unknown>): Promise<void> {
    await this.call('.handle_quick_operation', { context, operation });
  }

  async setModelShow(model: string, modelShow: string): Promise<void> {
    await this.call('_set_model_show', { model, model_show: modelShow });
  }

  async getModelShow(model: string): Promise<ModelShowInfo> {
    return this.call<ModelShowInfo>('_get_model_show', { model });
  }

  async getOnlineClients(): Promise<unknown> {
    return this.call('get_online_clients');
  }

  async setGroupSign(groupId: string): Promise<void> {
    await this.call('set_group_sign', { group_id: groupId });
  }

  async sendPoke(userId: number, groupId?: number): Promise<void> {
    const params: Record<string, unknown> = { user_id: userId };
    if (groupId) params.group_id = groupId;
    await this.call('send_poke', params);
  }

  async arkSharePeer(userId?: string, groupId?: string, phoneNumber?: string): Promise<ArkShareResult> {
    return this.call<ArkShareResult>('ArkSharePeer', {
      ...(userId ? { user_id: userId } : {}),
      ...(groupId ? { group_id: groupId } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    });
  }

  async arkShareGroup(groupId: string): Promise<string> {
    return this.call<string>('ArkShareGroup', { group_id: groupId });
  }

  async getRobotUinRange(): Promise<RobotUinRange[]> {
    return this.call<RobotUinRange[]>('get_robot_uin_range');
  }

  async setOnlineStatus(status: number, extStatus: number, batteryStatus = 100): Promise<void> {
    await this.call('set_online_status', { status, ext_status: extStatus, battery_status: batteryStatus });
  }

  async getFriendsWithCategory(): Promise<FriendCategory[]> {
    return this.call<FriendCategory[]>('get_friends_with_category');
  }

  async setQqAvatar(file: string): Promise<void> {
    await this.call('set_qq_avatar', { file });
  }

  async getFile(fileId: string): Promise<FileInfo> {
    return this.call<FileInfo>('get_file', { file_id: fileId });
  }

  async forwardFriendSingleMsg(messageId: number, userId: number): Promise<void> {
    await this.call('forward_friend_single_msg', { message_id: messageId, user_id: userId });
  }

  async forwardGroupSingleMsg(messageId: number, groupId: number): Promise<void> {
    await this.call('forward_group_single_msg', { message_id: messageId, group_id: groupId });
  }

  async translateEn2Zh(words: string[]): Promise<string[]> {
    return this.call<string[]>('translate_en2zh', { words });
  }

  async setMsgEmojiLike(messageId: number, emojiId: string): Promise<void> {
    await this.call('set_msg_emoji_like', { message_id: messageId, emoji_id: emojiId });
  }

  async markPrivateMsgAsRead(userId: number): Promise<void> {
    await this.call('mark_private_msg_as_read', { user_id: userId });
  }

  async markGroupMsgAsRead(groupId: number): Promise<void> {
    await this.call('mark_group_msg_as_read', { group_id: groupId });
  }

  async getFriendMsgHistory(userId: string, messageSeq = '0', count = 20, reverseOrder = false): Promise<{ messages: MessageInfo[] }> {
    return this.call('get_friend_msg_history', { user_id: userId, message_seq: messageSeq, count, reverseOrder });
  }

  async createCollection(rawData: string, brief: string): Promise<void> {
    await this.call('create_collection', { rawData, brief });
  }

  async getCollectionList(): Promise<CollectionInfo[]> {
    return this.call<CollectionInfo[]>('get_collection_list');
  }

  async setSelfLongnick(longNick: string): Promise<{ result: number; errMsg: string }> {
    return this.call('set_self_longnick', { longNick });
  }

  async getRecentContact(count = 10): Promise<RecentContact[]> {
    return this.call<RecentContact[]>('get_recent_contact', { count });
  }

  async markAllAsRead(): Promise<void> {
    await this.call('_mark_all_as_read');
  }

  async getProfileLike(): Promise<ProfileLikeData> {
    return this.call<ProfileLikeData>('get_profile_like');
  }

  async fetchCustomFace(count = 48): Promise<string[]> {
    return this.call<string[]>('fetch_custom_face', { count });
  }

  async getAiRecord(character: string, groupId: number, text: string): Promise<{ data: string }> {
    return this.call('get_ai_record', { character, group_id: groupId, text });
  }

  async getAiCharacters(groupId: number, chatType = 1): Promise<AiCharacterGroup[]> {
    return this.call<AiCharacterGroup[]>('get_ai_characters', { group_id: groupId, chat_type: chatType });
  }

  async sendGroupAiRecord(character: string, groupId: number, text: string): Promise<{ message_id: string }> {
    return this.call('send_group_ai_record', { character, group_id: groupId, text });
  }
}
