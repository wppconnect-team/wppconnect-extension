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
  | 'sendPoll'
  | 'sendLocation'
  | 'sendVCard';

export interface WaJsLabPayload {
  action: WaJsLabAction;
  chatId?: string;
  contactId?: string;
  text?: string;
  limit?: number;
  latitude?: number;
  longitude?: number;
}

export interface WaJsLabResponse {
  ok: boolean;
  action: WaJsLabAction;
  durationMs: number;
  timestamp: string;
  data?: unknown;
  error?: string;
}
