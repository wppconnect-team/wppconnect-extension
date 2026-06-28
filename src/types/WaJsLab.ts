import type { Attachment } from './Attachment';

export type WaJsLabMediaType = 'image' | 'audio' | 'video' | 'document';

export type WaJsLabAction =
  | 'diagnostics'
  | 'profile'
  | 'listChats'
  | 'listUnreadChats'
  | 'activeChat'
  | 'chatMessages'
  | 'queryContact'
  | 'contactStatus'
  | 'profilePicture'
  | 'businessProfile'
  | 'commonGroups'
  | 'openChat'
  | 'openNewChat'
  | 'markRead'
  | 'markUnread'
  | 'pinChat'
  | 'unpinChat'
  | 'muteChat'
  | 'unmuteChat'
  | 'archiveChat'
  | 'unarchiveChat'
  | 'typing'
  | 'recording'
  | 'pauseTyping'
  | 'setInput'
  | 'sendText'
  | 'sendImage'
  | 'sendAudio'
  | 'sendVideo'
  | 'sendDocument'
  | 'sendPoll'
  | 'sendLocation'
  | 'sendVCard'
  | 'captureBulkTargets'
  | 'listFunctions'
  | 'executeFunction';

export interface WaJsLabPayload {
  action: WaJsLabAction;
  chatId?: string;
  contactId?: string;
  text?: string;
  limit?: number;
  latitude?: number;
  longitude?: number;
  functionPath?: string;
  argsJson?: string;
  attachment?: Attachment;
  mediaType?: WaJsLabMediaType;
}

export interface WaJsLabResponse {
  ok: boolean;
  action: WaJsLabAction;
  durationMs: number;
  timestamp: string;
  data?: unknown;
  error?: string;
}
