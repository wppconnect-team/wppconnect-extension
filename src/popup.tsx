import React, { ChangeEvent, Component, FormEvent, MouseEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Button from './components/atoms/Button';
import { ControlInput, ControlTextArea } from './components/atoms/ControlFactory';
import ArchiveStatus from './types/ArchiveStatus';
import Log from './types/Log';
import QueueStatus from './types/QueueStatus';
import { WaJsLabAction, WaJsLabResponse } from './types/WaJsLab';
import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';

const PopupMessageManager = new AsyncChromeMessageManager('popup');

const createLocalArchiveStatus = (phase: ArchiveStatus['phase'], error?: string): ArchiveStatus => ({
  isProcessing: phase === 'starting' || phase === 'listing' || phase === 'archiving',
  phase,
  totalItems: 0,
  processedItems: 0,
  remainingItems: 0,
  failedItems: 0,
  elapsedTime: 0,
  waiting: false,
  aborted: phase === 'cancelled',
  error
});

type PopupTab = 'executions' | 'history';
type PopupAction =
  | 'sendMessage'
  | 'archiveChats'
  | 'diagnostics'
  | 'listChats'
  | 'listUnreadChats'
  | 'activeChat'
  | 'queryContact'
  | 'openChat'
  | 'markRead'
  | 'markUnread'
  | 'pinChat'
  | 'muteChat'
  | 'sendText'
  | 'profile'
  | 'contactStatus'
  | 'profilePicture'
  | 'businessProfile'
  | 'commonGroups'
  | 'unpinChat'
  | 'unmuteChat'
  | 'archiveChat'
  | 'unarchiveChat'
  | 'typing'
  | 'recording'
  | 'pauseTyping'
  | 'setInput'
  | 'sendPoll'
  | 'sendLocation'
  | 'sendVCard'
  | 'allWaJsFunctions';

type DeliveryMode = 'now' | 'scheduled';

type PopupState = {
  contacts: string,
  duplicatedContacts: number,
  status?: QueueStatus,
  archiveStatus?: ArchiveStatus,
  confirmed: boolean,
  archiveConfirmOpen: boolean,
  connectionError?: string,
  activeTab: PopupTab,
  selectedAction: PopupAction | '',
  actionMenuOpen: boolean,
  labChatId: string,
  labContactId: string,
  labText: string,
  labLimit: number,
  labLatitude: string,
  labLongitude: string,
  advancedFunctionPath: string,
  advancedArgsJson: string,
  availableFunctions: string[],
  deliveryMode: DeliveryMode,
  scheduledAt: string,
  labLoading: boolean,
  labResult?: WaJsLabResponse,
  logs: Log[],
  activeOperation?: 'send' | 'archive'
};

type UiIcon =
  | 'send'
  | 'archive'
  | 'settings'
  | 'clock'
  | 'check'
  | 'search'
  | 'zap'
  | 'list'
  | 'user'
  | 'play'
  | 'refresh'
  | 'alert'
  | 'message'
  | 'pin';

const Icon = ({ name, className = 'h-5 w-5' }: { name: UiIcon, className?: string }) => {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2
  };

  const paths: Record<UiIcon, ReactNode> = {
    send: <><path d="M4 11.5 20 4l-7.5 16-2-7-6.5-1.5Z" /><path d="m11 13 4-4" /></>,
    archive: <><path d="M4 7h16" /><path d="M6 7v12h12V7" /><path d="M9 11h6" /><path d="m8 4 8 0 1 3H7l1-3Z" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19 12a7.8 7.8 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.1L14 3h-4l-.4 2.8a7 7 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.5A7.8 7.8 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.1L10 21h4l.4-2.8a7 7 0 0 0 2-1.1l2.4 1 2-3.4-2-1.5c.1-.4.2-.8.2-1.2Z" /></>,
    clock: <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M12 7v5l3 2" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    search: <><path d="m21 21-4.3-4.3" /><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /></>,
    zap: <><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" /></>,
    list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0" /><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></>,
    play: <path d="M8 5v14l11-7-11-7Z" />,
    refresh: <><path d="M21 12a9 9 0 0 1-14.8 6.9" /><path d="M3 12A9 9 0 0 1 17.8 5.1" /><path d="M7 19H3v-4" /><path d="M17 5h4v4" /></>,
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /></>,
    pin: <><path d="m15 4 5 5-4 1-4 6-2-2-5 5 5-5-2-2 6-4 1-4Z" /></>
  };

  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>;
};

class Popup extends Component<{}, PopupState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      contacts: '',
      duplicatedContacts: 0,
      status: undefined,
      archiveStatus: undefined,
      confirmed: true,
      archiveConfirmOpen: false,
      connectionError: undefined,
      activeTab: 'executions',
      selectedAction: '',
      actionMenuOpen: false,
      labChatId: '',
      labContactId: '',
      labText: 'Teste WA-JS Lab',
      labLimit: 10,
      labLatitude: '-23.55052',
      labLongitude: '-46.633308',
      advancedFunctionPath: '',
      advancedArgsJson: '[]',
      availableFunctions: [],
      deliveryMode: 'now',
      scheduledAt: '',
      labLoading: false,
      labResult: undefined,
      logs: [],
      activeOperation: undefined
    };
  }

  duplicatedNumberPopup = chrome.i18n.getMessage('duplicatedNumberPopup');
  sendingMessagePopup = chrome.i18n.getMessage('sendingMessagePopup');
  messageTimePopup = chrome.i18n.getMessage('messageTimePopup');
  sendingPopup = chrome.i18n.getMessage('sendingPopup');
  waitingPopup = chrome.i18n.getMessage('waitingPopup');
  messagesSentPopup = chrome.i18n.getMessage('messagesSentPopup');
  duplicatedContactsPopup = chrome.i18n.getMessage('duplicatedContactsPopup');
  messagesLeftPopup = chrome.i18n.getMessage('messagesLeftPopup');
  messagesNotSentPopup = chrome.i18n.getMessage('messagesNotSentPopup');
  prefixFooterNotePopup = chrome.i18n.getMessage('prefixFooterNotePopup');
  messagePlaceholderPopup = chrome.i18n.getMessage('messagePlaceholderPopup');
  cancelButtonLabel = chrome.i18n.getMessage('cancelButtonLabel');
  okButtonLabel = chrome.i18n.getMessage('okButtonLabel');
  optionsButtonLabel = chrome.i18n.getMessage('optionsButtonLabel');
  sendButtonLabel = chrome.i18n.getMessage('sendButtonLabel');
  defaultMessage = chrome.i18n.getMessage('defaultMessage');
  contactsLabel = chrome.i18n.getMessage('contactsLabel') || 'Contacts';
  uniqueContactsLabel = chrome.i18n.getMessage('uniqueContactsLabel') || 'Unique';
  totalContactsLabel = chrome.i18n.getMessage('totalContactsLabel') || 'Total';
  readyToSendLabel = chrome.i18n.getMessage('readyToSendLabel') || 'Ready to send';
  queueFinishedLabel = chrome.i18n.getMessage('queueFinishedLabel') || 'Queue finished';
  archiveChatsButtonLabel = chrome.i18n.getMessage('archiveChatsButtonLabel') || 'Archive chats';
  archiveChatsConfirmLabel = chrome.i18n.getMessage('archiveChatsConfirmLabel') || 'Archive all non-archived chats?';
  archiveConfirmDescriptionLabel = chrome.i18n.getMessage('archiveConfirmDescriptionLabel') || 'This will process every visible non-archived WhatsApp Web chat that can be archived.';
  archiveConfirmSubmitLabel = chrome.i18n.getMessage('archiveConfirmSubmitLabel') || 'Archive now';
  archiveProgressTitle = chrome.i18n.getMessage('archiveProgressTitle') || 'Archiving chats';
  archiveFinishedTitle = chrome.i18n.getMessage('archiveFinishedTitle') || 'Archiving finished';
  archiveStartingTitle = chrome.i18n.getMessage('archiveStartingTitle') || 'Preparing archiving';
  archiveListingLabel = chrome.i18n.getMessage('archiveListingLabel') || 'Searching chats...';
  archiveNoChatsLabel = chrome.i18n.getMessage('archiveNoChatsLabel') || 'No non-archived chats were found.';
  archiveCancelledTitle = chrome.i18n.getMessage('archiveCancelledTitle') || 'Archiving cancelled';
  archiveErrorTitle = chrome.i18n.getMessage('archiveErrorTitle') || 'Unable to archive chats';
  archiveOpenWhatsAppLabel = chrome.i18n.getMessage('archiveOpenWhatsAppLabel') || 'Open WhatsApp Web, keep it connected, then try again.';
  whatsappConnectionHelpLabel = chrome.i18n.getMessage('whatsappConnectionHelpLabel') || 'Open or reload WhatsApp Web before using send or archive actions.';
  archivedChatsLabel = chrome.i18n.getMessage('archivedChatsLabel') || 'Archived';
  archiveFailedLabel = chrome.i18n.getMessage('archiveFailedLabel') || 'Failed';
  archiveCurrentChatLabel = chrome.i18n.getMessage('archiveCurrentChatLabel') || 'Current chat';
  wajsLabResultLabel = chrome.i18n.getMessage('wajsLabResultLabel') || 'Result';
  wajsLabPlaceholderResult = chrome.i18n.getMessage('wajsLabPlaceholderResult') || 'Run an action to see the WA-JS response.';
  dashboardTitle = chrome.i18n.getMessage('dashboardTitle') || 'WA Executions';
  dashboardSubtitle = chrome.i18n.getMessage('dashboardSubtitle') || 'Automate WhatsApp functions';
  executionsTabLabel = chrome.i18n.getMessage('executionsTabLabel') || 'Executions';
  historyTabLabel = chrome.i18n.getMessage('historyTabLabel') || 'History';
  newExecutionTitle = chrome.i18n.getMessage('newExecutionTitle') || 'New execution';
  newExecutionSubtitle = chrome.i18n.getMessage('newExecutionSubtitle') || 'Select a function to run on WhatsApp';
  selectFunctionLabel = chrome.i18n.getMessage('selectFunctionLabel') || 'Select function';
  executeButtonLabel = chrome.i18n.getMessage('executeButtonLabel') || 'Execute';
  quickExecutionsTitle = chrome.i18n.getMessage('quickExecutionsTitle') || 'Quick executions';
  summaryTitle = chrome.i18n.getMessage('summaryTitle') || 'Summary';
  latestExecutionsTitle = chrome.i18n.getMessage('latestExecutionsTitle') || 'Latest executions';
  viewAllLabel = chrome.i18n.getMessage('viewAllLabel') || 'View all';
  whatsappConnectedLabel = chrome.i18n.getMessage('whatsappConnectedLabel') || 'WhatsApp connected';
  whatsappNeedsConnectionLabel = chrome.i18n.getMessage('whatsappNeedsConnectionLabel') || 'Check WhatsApp connection';
  checkConnectionLabel = chrome.i18n.getMessage('checkConnectionLabel') || 'Check connection';
  contactsHelperLabel = chrome.i18n.getMessage('contactsHelperLabel') || 'Paste contacts separated by comma, semicolon or line break.';
  todaySentLabel = chrome.i18n.getMessage('todaySentLabel') || 'Sent today';
  duplicatesTodayLabel = chrome.i18n.getMessage('duplicatesTodayLabel') || 'Duplicates';
  completedThisMonthLabel = chrome.i18n.getMessage('completedThisMonthLabel') || 'Completed';
  noRecentExecutionsLabel = chrome.i18n.getMessage('noRecentExecutionsLabel') || 'No recent executions yet.';
  noFunctionSelectedLabel = chrome.i18n.getMessage('noFunctionSelectedLabel') || 'Choose a function before running.';
  functionSendMessageLabel = chrome.i18n.getMessage('functionSendMessageLabel') || 'Bulk message';
  functionArchiveChatsLabel = chrome.i18n.getMessage('functionArchiveChatsLabel') || 'Archive chats';
  functionListChatsLabel = chrome.i18n.getMessage('functionListChatsLabel') || 'List chats';
  functionUnreadChatsLabel = chrome.i18n.getMessage('functionUnreadChatsLabel') || 'Unread chats';
  functionVerifyNumberLabel = chrome.i18n.getMessage('functionVerifyNumberLabel') || 'Verify number';
  functionDiagnosticsLabel = chrome.i18n.getMessage('functionDiagnosticsLabel') || 'Connection diagnostics';
  functionActiveChatLabel = chrome.i18n.getMessage('functionActiveChatLabel') || 'Active chat';
  functionOpenChatLabel = chrome.i18n.getMessage('functionOpenChatLabel') || 'Open chat';
  functionMarkReadLabel = chrome.i18n.getMessage('functionMarkReadLabel') || 'Mark read';
  functionMarkUnreadLabel = chrome.i18n.getMessage('functionMarkUnreadLabel') || 'Mark unread';
  functionPinChatLabel = chrome.i18n.getMessage('functionPinChatLabel') || 'Pin chat';
  functionMuteChatLabel = chrome.i18n.getMessage('functionMuteChatLabel') || 'Mute chat';
  functionSendTextLabel = chrome.i18n.getMessage('functionSendTextLabel') || 'Send text';
  functionSendMessageDescription = chrome.i18n.getMessage('functionSendMessageDescription') || 'For contacts or lists';
  functionArchiveChatsDescription = chrome.i18n.getMessage('functionArchiveChatsDescription') || 'Archive non-archived chats';
  functionListChatsDescription = chrome.i18n.getMessage('functionListChatsDescription') || 'Inspect available chats';
  functionVerifyNumberDescription = chrome.i18n.getMessage('functionVerifyNumberDescription') || 'Check contact existence';
  functionRequiresChatLabel = chrome.i18n.getMessage('functionRequiresChatLabel') || 'Chat ID or phone';
  functionRequiresContactLabel = chrome.i18n.getMessage('functionRequiresContactLabel') || 'Contact ID or phone';
  functionRequiresTextLabel = chrome.i18n.getMessage('functionRequiresTextLabel') || 'Message text';
  bulkCaptureTargetsLabel = chrome.i18n.getMessage('bulkCaptureTargetsLabel') || 'Capture chats/contacts';
  bulkSpamWarningLabel = chrome.i18n.getMessage('bulkSpamWarningLabel') || 'WhatsApp is increasingly strict with exaggerated spam. Use conservative volumes, consented contacts and realistic delays.';
  deliveryModeLabel = chrome.i18n.getMessage('deliveryModeLabel') || 'Delivery';
  sendNowLabel = chrome.i18n.getMessage('sendNowLabel') || 'Send now';
  scheduleMessageLabel = chrome.i18n.getMessage('scheduleMessageLabel') || 'Schedule';
  scheduleDateLabel = chrome.i18n.getMessage('scheduleDateLabel') || 'Date and time';
  scheduledQueueLabel = chrome.i18n.getMessage('scheduledQueueLabel') || 'Scheduled in the WhatsApp Web tab. Keep it open and connected.';
  allWaJsFunctionsLabel = chrome.i18n.getMessage('allWaJsFunctionsLabel') || 'All WA-JS functions';
  allWaJsFunctionsDescription = chrome.i18n.getMessage('allWaJsFunctionsDescription') || 'Select any runtime WPP function';
  refreshFunctionsLabel = chrome.i18n.getMessage('refreshFunctionsLabel') || 'Load functions';
  functionPathLabel = chrome.i18n.getMessage('functionPathLabel') || 'Function path';
  functionArgsLabel = chrome.i18n.getMessage('functionArgsLabel') || 'Arguments JSON array';
  functionArgsHelpLabel = chrome.i18n.getMessage('functionArgsHelpLabel') || 'Example: [\"5511999999999@c.us\", {\"count\": 10}]';
  functionProfileLabel = chrome.i18n.getMessage('functionProfileLabel') || 'Profile';
  functionContactStatusLabel = chrome.i18n.getMessage('functionContactStatusLabel') || 'Contact status';
  functionProfilePictureLabel = chrome.i18n.getMessage('functionProfilePictureLabel') || 'Contact picture';
  functionBusinessProfileLabel = chrome.i18n.getMessage('functionBusinessProfileLabel') || 'Business profile';
  functionCommonGroupsLabel = chrome.i18n.getMessage('functionCommonGroupsLabel') || 'Common groups';
  functionUnpinChatLabel = chrome.i18n.getMessage('functionUnpinChatLabel') || 'Unpin chat';
  functionUnmuteChatLabel = chrome.i18n.getMessage('functionUnmuteChatLabel') || 'Unmute chat';
  functionArchiveChatLabel = chrome.i18n.getMessage('functionArchiveChatLabel') || 'Archive chat';
  functionUnarchiveChatLabel = chrome.i18n.getMessage('functionUnarchiveChatLabel') || 'Unarchive chat';
  functionTypingLabel = chrome.i18n.getMessage('functionTypingLabel') || 'Typing 5s';
  functionRecordingLabel = chrome.i18n.getMessage('functionRecordingLabel') || 'Recording 5s';
  functionPauseTypingLabel = chrome.i18n.getMessage('functionPauseTypingLabel') || 'Pause typing';
  functionSetInputLabel = chrome.i18n.getMessage('functionSetInputLabel') || 'Fill input';
  functionSendPollLabel = chrome.i18n.getMessage('functionSendPollLabel') || 'Send poll';
  functionSendLocationLabel = chrome.i18n.getMessage('functionSendLocationLabel') || 'Send location';
  functionSendVCardLabel = chrome.i18n.getMessage('functionSendVCardLabel') || 'Send vCard';

  queueStatusListener = 0;
  archiveStatusListener = 0;
  logListener = 0;

  actions: Array<{ value: PopupAction, label: string, icon: UiIcon, labAction?: WaJsLabAction, needsChat?: boolean, needsContact?: boolean, needsText?: boolean }> = [
    { value: 'sendMessage', label: this.functionSendMessageLabel, icon: 'send' },
    { value: 'archiveChats', label: this.functionArchiveChatsLabel, icon: 'archive' },
    { value: 'diagnostics', label: this.functionDiagnosticsLabel, icon: 'zap', labAction: 'diagnostics' },
    { value: 'profile', label: this.functionProfileLabel, icon: 'user', labAction: 'profile' },
    { value: 'listChats', label: this.functionListChatsLabel, icon: 'list', labAction: 'listChats' },
    { value: 'listUnreadChats', label: this.functionUnreadChatsLabel, icon: 'message', labAction: 'listUnreadChats' },
    { value: 'activeChat', label: this.functionActiveChatLabel, icon: 'check', labAction: 'activeChat' },
    { value: 'queryContact', label: this.functionVerifyNumberLabel, icon: 'search', labAction: 'queryContact', needsContact: true },
    { value: 'contactStatus', label: this.functionContactStatusLabel, icon: 'message', labAction: 'contactStatus', needsContact: true },
    { value: 'profilePicture', label: this.functionProfilePictureLabel, icon: 'user', labAction: 'profilePicture', needsContact: true },
    { value: 'businessProfile', label: this.functionBusinessProfileLabel, icon: 'user', labAction: 'businessProfile', needsContact: true },
    { value: 'commonGroups', label: this.functionCommonGroupsLabel, icon: 'list', labAction: 'commonGroups', needsContact: true },
    { value: 'openChat', label: this.functionOpenChatLabel, icon: 'user', labAction: 'openChat', needsChat: true },
    { value: 'markRead', label: this.functionMarkReadLabel, icon: 'check', labAction: 'markRead', needsChat: true },
    { value: 'markUnread', label: this.functionMarkUnreadLabel, icon: 'message', labAction: 'markUnread', needsChat: true },
    { value: 'pinChat', label: this.functionPinChatLabel, icon: 'pin', labAction: 'pinChat', needsChat: true },
    { value: 'unpinChat', label: this.functionUnpinChatLabel, icon: 'pin', labAction: 'unpinChat', needsChat: true },
    { value: 'muteChat', label: this.functionMuteChatLabel, icon: 'clock', labAction: 'muteChat', needsChat: true },
    { value: 'unmuteChat', label: this.functionUnmuteChatLabel, icon: 'clock', labAction: 'unmuteChat', needsChat: true },
    { value: 'archiveChat', label: this.functionArchiveChatLabel, icon: 'archive', labAction: 'archiveChat', needsChat: true },
    { value: 'unarchiveChat', label: this.functionUnarchiveChatLabel, icon: 'archive', labAction: 'unarchiveChat', needsChat: true },
    { value: 'typing', label: this.functionTypingLabel, icon: 'message', labAction: 'typing', needsChat: true },
    { value: 'recording', label: this.functionRecordingLabel, icon: 'message', labAction: 'recording', needsChat: true },
    { value: 'pauseTyping', label: this.functionPauseTypingLabel, icon: 'message', labAction: 'pauseTyping', needsChat: true },
    { value: 'setInput', label: this.functionSetInputLabel, icon: 'message', labAction: 'setInput', needsText: true },
    { value: 'sendText', label: this.functionSendTextLabel, icon: 'send', labAction: 'sendText', needsChat: true, needsText: true },
    { value: 'sendPoll', label: this.functionSendPollLabel, icon: 'send', labAction: 'sendPoll', needsChat: true, needsText: true },
    { value: 'sendLocation', label: this.functionSendLocationLabel, icon: 'send', labAction: 'sendLocation', needsChat: true },
    { value: 'sendVCard', label: this.functionSendVCardLabel, icon: 'send', labAction: 'sendVCard', needsChat: true, needsContact: true, needsText: true },
    { value: 'allWaJsFunctions', label: this.allWaJsFunctionsLabel, icon: 'zap', labAction: 'executeFunction' }
  ];

  componentDidMount() {
    const body = document.querySelector('body');
    if (!body) return;
    body.classList.add('bg-slate-950');
    body.classList.add('text-slate-100');
    body.style.minWidth = '34rem';

    this.updateStatus();
    this.updateArchiveStatus();
    this.updateLogs();
    this.queueStatusListener = window.setInterval(this.updateStatus, 500);
    this.archiveStatusListener = window.setInterval(this.updateArchiveStatus, 500);
    this.logListener = window.setInterval(this.updateLogs, 2500);
  }

  componentWillUnmount() {
    clearInterval(this.queueStatusListener);
    clearInterval(this.archiveStatusListener);
    clearInterval(this.logListener);
  }

  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<PopupState>) {
    if (!prevState.status?.isProcessing && this.state.status?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'send', activeTab: 'executions' });
    }
    if (!prevState.archiveStatus?.isProcessing && this.state.archiveStatus?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'archive', activeTab: 'executions' });
    }
  }

  updateStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.QUEUE_STATUS, undefined).then((status) => {
      this.setState({ status, connectionError: undefined });
    }).catch((error) => {
      this.setState({ connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel });
    });
  }

  updateArchiveStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.ARCHIVE_STATUS, undefined).then((archiveStatus) => {
      this.setState({ archiveStatus, connectionError: undefined });
    }).catch((error) => {
      if (this.state.activeOperation === 'archive') {
        this.setState({
          archiveStatus: createLocalArchiveStatus('error', error instanceof Error ? error.message : this.archiveOpenWhatsAppLabel)
        });
      } else {
        this.setState({ connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel });
      }
    });
  }

  updateLogs = () => {
    chrome.storage.local.get({ logs: [] }, data => this.setState({ logs: data.logs || [] }));
  }

  addLocalLog = (log: Omit<Log, 'date'>) => {
    chrome.storage.local.get({ logs: [] }, data => {
      const logs = [
        ...(data.logs || []),
        {
          ...log,
          date: new Date().toLocaleString()
        }
      ];
      chrome.storage.local.set({ logs }, () => this.setState({ logs }));
    });
  }

  handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ contacts: event.target.value.replace(/[^\d\n\t,;]*/g, '') });
  }

  getContactList = () => {
    return this.state.contacts
      .split(/[\n\t,;]/)
      .map(str => str.trim().replace(/[\D]*/g, ''))
      .filter(str => str !== '');
  }

  getContactSummary = () => {
    const contactList = this.getContactList();
    const uniqueContacts = contactList.filter((contact, index) => contactList.indexOf(contact) === index);

    return {
      total: contactList.length,
      unique: uniqueContacts.length,
      duplicated: contactList.length - uniqueContacts.length
    };
  }

  parseContacts = (prefix: number) => {
    const prefixToString = (prefix === 0 ? '' : prefix).toString();
    const contactList = this.getContactList();
    const pristinedContactsWithPrefix = contactList.map(s => prefixToString.concat(s));
    let duplicatedContacts = 0;

    const contacts = pristinedContactsWithPrefix.filter((contact: string, index: number) => {
      const result = pristinedContactsWithPrefix.indexOf(contact) === index;
      if (!result) {
        duplicatedContacts += 1;
        PopupMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 2, message: this.duplicatedNumberPopup, attachment: false, contact });
      }

      return result;
    });

    this.setState({ duplicatedContacts });
    return contacts;
  }

  startSendMessages = () => {
    const language = chrome.i18n.getUILanguage();
    chrome.storage.local.get({ message: this.defaultMessage, attachment: null, buttons: [], delay: 0, prefix: language === 'pt_BR' ? 55 : 0 }, async data => {
      const contacts = this.parseContacts(data.prefix);
      if (contacts.length === 0) return;
      const scheduledAt = this.state.deliveryMode === 'scheduled' && this.state.scheduledAt
        ? new Date(this.state.scheduledAt).getTime()
        : undefined;

      contacts.forEach(contact => {
        PopupMessageManager.sendMessage(ChromeMessageTypes.SEND_MESSAGE, { contact, message: data.message, attachment: data.attachment, buttons: data.buttons, delay: data.delay, scheduledAt })
          .catch((error) => this.setState({ connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel }));
      });
      this.setState({ confirmed: false, activeOperation: 'send' });
    });
  }

  handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.startSendMessages();
  }

  confirmArchiveChats = () => {
    this.setState({
      archiveConfirmOpen: false,
      confirmed: false,
      activeOperation: 'archive',
      archiveStatus: createLocalArchiveStatus('starting')
    });

    window.setTimeout(() => {
      if (this.state.activeOperation === 'archive' && this.state.archiveStatus?.phase === 'starting') {
        this.setState({
          archiveStatus: createLocalArchiveStatus('error', this.archiveOpenWhatsAppLabel)
        });
      }
    }, 4500);

    chrome.storage.local.get({ archiveDelayMs: 500 }, data => {
      PopupMessageManager.sendMessage(ChromeMessageTypes.ARCHIVE_ALL_CHATS, { delayMs: data.archiveDelayMs })
        .then(() => this.updateArchiveStatus())
        .catch((error) => {
          this.setState({
            archiveStatus: createLocalArchiveStatus('error', error instanceof Error ? error.message : this.archiveOpenWhatsAppLabel)
          });
        });
    });
  }

  handleOptions = (event?: MouseEvent<HTMLButtonElement>) => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  getSelectedAction = () => {
    return this.actions.find(action => action.value === this.state.selectedAction);
  }

  executeSelectedAction = () => {
    const selectedAction = this.getSelectedAction();
    if (!selectedAction) {
      this.setState({ connectionError: this.noFunctionSelectedLabel });
      return;
    }

    if (selectedAction.value === 'sendMessage') {
      this.startSendMessages();
      return;
    }

    if (selectedAction.value === 'archiveChats') {
      this.setState({ archiveConfirmOpen: true, connectionError: undefined });
      return;
    }

    if (selectedAction.value === 'allWaJsFunctions') {
      this.runLabAction('executeFunction');
      return;
    }

    if (selectedAction.labAction) this.runLabAction(selectedAction.labAction);
  }

  getActionHistoryLabel = (action: WaJsLabAction) => {
    if (action === 'executeFunction') return this.state.advancedFunctionPath || this.allWaJsFunctionsLabel;
    return this.actions.find(item => item.labAction === action)?.label || action;
  }

  getActionHistoryTarget = (action: WaJsLabAction) => {
    if (action === 'executeFunction') return this.state.advancedFunctionPath || '-';
    return this.state.labChatId || this.state.labContactId || '-';
  }

  runLabAction = (action: WaJsLabAction) => {
    this.setState({ labLoading: true, labResult: undefined, connectionError: undefined });
    PopupMessageManager.sendMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, {
      action,
      chatId: this.state.labChatId,
      contactId: this.state.labContactId,
      text: this.state.labText,
      limit: this.state.labLimit,
      latitude: Number(this.state.labLatitude),
      longitude: Number(this.state.labLongitude),
      functionPath: this.state.advancedFunctionPath,
      argsJson: this.state.advancedArgsJson
    }).then((labResult) => {
      this.addLocalLog({
        level: labResult.ok ? 3 : 1,
        message: `${this.getActionHistoryLabel(action)}: ${labResult.ok ? 'OK' : labResult.error || 'Erro'}`,
        attachment: false,
        contact: this.getActionHistoryTarget(action)
      });
      this.setState({ labResult, labLoading: false, connectionError: undefined, activeTab: 'history' });
    }).catch((error) => {
      const message = error instanceof Error ? error.message : this.whatsappConnectionHelpLabel;
      this.addLocalLog({
        level: 1,
        message: `${this.getActionHistoryLabel(action)}: ${message}`,
        attachment: false,
        contact: this.getActionHistoryTarget(action)
      });
      this.setState({
        labLoading: false,
        connectionError: message,
        activeTab: 'history',
        labResult: {
          ok: false,
          action,
          durationMs: 0,
          timestamp: new Date().toISOString(),
          error: message
        }
      });
    });
  }

  loadAvailableFunctions = () => {
    this.setState({ labLoading: true, connectionError: undefined });
    PopupMessageManager.sendMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, {
      action: 'listFunctions',
      limit: 50
    }).then((labResult) => {
      const data = labResult.data as { items?: string[] } | undefined;
      this.setState({
        labResult,
        labLoading: false,
        activeTab: 'executions',
        availableFunctions: data?.items || []
      });
    }).catch((error) => this.setState({
      labLoading: false,
      connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel
    }));
  }

  captureBulkTargets = () => {
    this.setState({ labLoading: true, connectionError: undefined });
    PopupMessageManager.sendMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, {
      action: 'captureBulkTargets',
      limit: 10000
    }).then((labResult) => {
      const data = labResult.data as { contactsText?: string } | undefined;
      this.setState({
        labResult,
        labLoading: false,
        contacts: data?.contactsText || this.state.contacts
      });
    }).catch((error) => this.setState({
      labLoading: false,
      connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel
    }));
  }

  selectQuickAction = (action: PopupAction) => {
    this.setState({
      selectedAction: action,
      activeTab: 'executions',
      archiveConfirmOpen: false,
      connectionError: undefined
    }, () => {
      if (action === 'listChats' || action === 'diagnostics') this.executeSelectedAction();
    });
  }

  formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const decimal = (milliseconds % 1000).toString().substr(0, 2);

    const hoursString = hours > 0 ? `${hours}h ` : '';
    const minutesString = minutes > 0 ? `${minutes}m ` : '';
    const secondsString = seconds > 0 || !hoursString && !minutesString ? `${seconds}.${decimal}s` : `0.${decimal}s`;

    return `${hoursString}${minutesString}${secondsString}`;
  };

  getProgress = () => {
    const processed = this.state.status?.processedItems || 0;
    const remaining = this.state.status?.remainingItems || 0;
    const total = processed + remaining;

    return total === 0 ? 0 : Math.round((processed / total) * 100);
  }

  getArchiveProgress = () => {
    const processed = this.state.archiveStatus?.processedItems || 0;
    const failed = this.state.archiveStatus?.failedItems || 0;
    const total = this.state.archiveStatus?.totalItems || 0;

    return total === 0 ? 0 : Math.round(((processed + failed) / total) * 100);
  }

  getArchiveTitle = () => {
    const phase = this.state.archiveStatus?.phase;
    if (phase === 'starting' || phase === 'listing') return this.archiveStartingTitle;
    if (phase === 'error') return this.archiveErrorTitle;
    if (phase === 'cancelled') return this.archiveCancelledTitle;
    if (this.state.archiveStatus?.isProcessing) return this.archiveProgressTitle;
    return this.archiveFinishedTitle;
  }

  getArchiveProgressLabel = () => {
    const archiveStatus = this.state.archiveStatus;
    if (archiveStatus?.phase === 'starting' || archiveStatus?.phase === 'listing') return this.archiveListingLabel;
    if (archiveStatus?.phase === 'error') return archiveStatus.error || this.archiveOpenWhatsAppLabel;
    if (archiveStatus?.phase === 'finished' && archiveStatus.totalItems === 0) return this.archiveNoChatsLabel;
    if (archiveStatus?.phase === 'cancelled') return this.archiveCancelledTitle;
    return archiveStatus?.currentChat || this.archiveChatsButtonLabel;
  }

  getLogDate = (log: Log) => {
    if (!log.date) return undefined;
    const parsed = new Date(log.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return undefined;
  }

  getSummary = () => {
    const now = new Date();
    const todayKey = now.toDateString();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.state.logs.reduce((summary, log) => {
      const date = this.getLogDate(log);
      if (log.level === 3 && (!date || date.toDateString() === todayKey)) summary.sentToday += 1;
      if (log.level === 2 && (!date || date.toDateString() === todayKey)) summary.duplicates += 1;
      if (log.level === 3 && (!date || date.getMonth() === month && date.getFullYear() === year)) summary.completed += 1;
      return summary;
    }, { sentToday: 0, duplicates: 0, completed: 0 });
  }

  isConnectionHealthy = () => !this.state.connectionError;

  renderShell(children: ReactNode) {
    return <main className="relative min-h-[38rem] w-[34rem] overflow-hidden bg-[#08111d] text-slate-100 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(16,185,129,0.20),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(14,165,233,0.16),transparent_30%),linear-gradient(135deg,#0c1624_0%,#111827_55%,#07111c_100%)]"></div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>
      <div className="relative flex min-h-[38rem] flex-col">
        {this.renderHeader()}
        {children}
        {this.renderFooter()}
      </div>
    </main>;
  }

  renderHeader() {
    return <header className="px-7 pb-5 pt-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/25">
            <img src="icons/wppconnect64.png" alt="" className="h-12 w-12 rounded-xl" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[1.55rem] font-extrabold tracking-normal text-white">{this.dashboardTitle}</h1>
            <p className="truncate text-sm text-slate-400">{this.dashboardSubtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="glass"
          className="shrink-0"
          onClick={this.handleOptions}
          icon={<Icon name="settings" className="h-5 w-5" />}
        >
          {this.optionsButtonLabel}
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-[1.15rem] bg-slate-950/28 p-2 ring-1 ring-white/7">
        {this.renderTab('executions', 'zap', this.executionsTabLabel)}
        {this.renderTab('history', 'clock', this.historyTabLabel)}
      </div>
    </header>;
  }

  renderTab(tab: PopupTab, icon: UiIcon, label: string) {
    const active = this.state.activeTab === tab;
    return <button
      type="button"
      onClick={() => this.setState({ activeTab: tab })}
      className={[
        'inline-flex h-12 items-center justify-center gap-3 rounded-xl text-sm font-bold transition',
        active
          ? 'bg-slate-700/72 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.10),0_18px_34px_rgba(0,0,0,.20)]'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      ].join(' ')}
    >
      <Icon name={icon} className={active ? 'h-5 w-5 text-emerald-300' : 'h-5 w-5'} />
      {label}
    </button>;
  }

  renderFooter() {
    const healthy = this.isConnectionHealthy();
    return <footer className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 px-7 py-4 text-sm text-slate-400">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${healthy ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.85)]' : 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,.65)]'}`}></span>
        <span className="truncate">{healthy ? this.whatsappConnectedLabel : this.whatsappNeedsConnectionLabel}</span>
      </div>
      <button type="button" onClick={() => { this.updateStatus(); this.updateArchiveStatus(); }} className="inline-flex shrink-0 items-center gap-2 font-semibold text-slate-400 transition hover:text-emerald-300">
        {this.checkConnectionLabel}
        <Icon name="refresh" className="h-4 w-4" />
      </button>
    </footer>;
  }

  renderPanel(children: ReactNode, className = '') {
    return <section className={`rounded-[1.15rem] border border-white/10 bg-slate-900/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_18px_60px_rgba(0,0,0,.18)] backdrop-blur ${className}`}>
      {children}
    </section>;
  }

  renderMetric(label: string, value: string | number, icon?: UiIcon, accent = 'text-emerald-300', detail?: string) {
    return <div className="min-w-0 rounded-xl border border-white/10 bg-slate-800/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
      <div className="flex items-start gap-3">
        {icon && <div className={`mt-0.5 ${accent}`}><Icon name={icon} className="h-6 w-6" /></div>}
        <div className="min-w-0">
          <div className="text-sm leading-5 text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{value}</div>
          {detail && <div className="mt-1 truncate text-xs text-slate-500">{detail}</div>}
        </div>
      </div>
    </div>;
  }

  renderConnectionNotice() {
    if (!this.state.connectionError) return null;

    return <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div className="min-w-0">
        <div className="font-bold">{this.whatsappConnectionHelpLabel}</div>
        <div className="mt-1 break-words font-mono text-[0.68rem] text-amber-100/80">{this.state.connectionError}</div>
      </div>
    </div>;
  }

  renderActionFields() {
    const selectedAction = this.getSelectedAction();
    const summary = this.getContactSummary();

    if (!selectedAction) return null;

    if (selectedAction.value === 'sendMessage') {
      return <form onSubmit={this.handleSubmit} className="mt-4 space-y-3">
        <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>{this.bulkSpamWarningLabel}</span>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.contactsLabel}</span>
          <ControlTextArea
            className="min-h-[8.5rem] resize-none"
            value={this.state.contacts}
            onChange={this.handleChange}
            placeholder={this.messagePlaceholderPopup || this.contactsHelperLabel}
            required
          />
        </label>
        <Button
          type="button"
          variant="glass"
          className="w-full"
          disabled={this.state.labLoading}
          onClick={this.captureBulkTargets}
          icon={<Icon name="list" className="h-4 w-4" />}
        >
          {this.bulkCaptureTargetsLabel}
        </Button>
        <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
          <div className="mb-3 text-sm font-semibold text-slate-300">{this.deliveryModeLabel}</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => this.setState({ deliveryMode: 'now' })} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${this.state.deliveryMode === 'now' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.sendNowLabel}</button>
            <button type="button" onClick={() => this.setState({ deliveryMode: 'scheduled' })} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${this.state.deliveryMode === 'scheduled' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.scheduleMessageLabel}</button>
          </div>
          {this.state.deliveryMode === 'scheduled' && <label className="mt-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">{this.scheduleDateLabel}</span>
            <ControlInput type="datetime-local" value={this.state.scheduledAt} onChange={(event) => this.setState({ scheduledAt: event.target.value })} />
            <span className="text-xs leading-5 text-slate-500">{this.scheduledQueueLabel}</span>
          </label>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {this.renderMiniMetric(this.totalContactsLabel, summary.total)}
          {this.renderMiniMetric(this.uniqueContactsLabel, summary.unique)}
          {this.renderMiniMetric(this.duplicatedContactsPopup, summary.duplicated)}
        </div>
        <p className="text-xs leading-5 text-slate-500">{this.prefixFooterNotePopup}</p>
      </form>;
    }

    if (selectedAction.value === 'allWaJsFunctions') {
      return <div className="mt-4 space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-300">{this.functionPathLabel}</span>
            <ControlInput
              list="wajs-functions"
              value={this.state.advancedFunctionPath}
              placeholder="WPP.chat.list"
              onChange={(event) => this.setState({ advancedFunctionPath: event.target.value })}
            />
            <datalist id="wajs-functions">
              {this.state.availableFunctions.map(path => <option key={path} value={path} />)}
            </datalist>
          </label>
          <Button className="self-end" variant="glass" type="button" disabled={this.state.labLoading} onClick={this.loadAvailableFunctions}>
            {this.refreshFunctionsLabel}
          </Button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.functionArgsLabel}</span>
          <ControlTextArea
            className="min-h-[6rem] resize-y font-mono text-xs"
            value={this.state.advancedArgsJson}
            onChange={(event) => this.setState({ advancedArgsJson: event.target.value })}
          />
          <span className="text-xs leading-5 text-slate-500">{this.functionArgsHelpLabel}</span>
        </label>
      </div>;
    }

    return <div className="mt-4 grid grid-cols-2 gap-3">
      {selectedAction.needsChat && <label className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-300">{this.functionRequiresChatLabel}</span>
        <ControlInput value={this.state.labChatId} placeholder="5511999999999 ou ...@g.us" onChange={(event) => this.setState({ labChatId: event.target.value })} />
      </label>}
      {selectedAction.needsContact && <label className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-300">{this.functionRequiresContactLabel}</span>
        <ControlInput value={this.state.labContactId} placeholder="5511999999999" onChange={(event) => this.setState({ labContactId: event.target.value })} />
      </label>}
      {selectedAction.needsText && <label className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-300">{this.functionRequiresTextLabel}</span>
        <ControlInput value={this.state.labText} onChange={(event) => this.setState({ labText: event.target.value })} />
      </label>}
    </div>;
  }

  renderActionSelector() {
    const selectedAction = this.getSelectedAction();

    return <div>
      <button
        type="button"
        onClick={() => this.setState({ actionMenuOpen: !this.state.actionMenuOpen })}
        className="flex min-h-[2.9rem] w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2 text-left text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] outline-none transition hover:border-emerald-400/35 focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon name={selectedAction?.icon || 'list'} className="h-5 w-5 shrink-0 text-slate-500" />
          <span className={selectedAction ? 'truncate text-slate-100' : 'truncate text-slate-400'}>{selectedAction?.label || this.selectFunctionLabel}</span>
        </span>
        <span className={`text-slate-500 transition ${this.state.actionMenuOpen ? 'rotate-180' : ''}`}>v</span>
      </button>
      {this.state.actionMenuOpen && <div className="mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl">
        <button
          type="button"
          onClick={() => this.setState({ selectedAction: '', actionMenuOpen: false })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="list" className="h-4 w-4" />
          {this.selectFunctionLabel}
        </button>
        {this.actions.map(action => (
          <button
            type="button"
            key={action.value}
            onClick={() => this.setState({ selectedAction: action.value, actionMenuOpen: false, archiveConfirmOpen: false, connectionError: undefined })}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${this.state.selectedAction === action.value ? 'bg-emerald-500/15 text-emerald-100' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon name={action.icon} className="h-4 w-4 shrink-0 text-emerald-300" />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>}
    </div>;
  }

  renderMiniMetric(label: string, value: string | number) {
    return <div className="rounded-xl border border-white/10 bg-slate-950/36 p-3">
      <div className="truncate text-[0.68rem] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-white">{value}</div>
    </div>;
  }

  renderArchiveConfirmation() {
    if (!this.state.archiveConfirmOpen) return null;

    return <div role="dialog" aria-modal="false" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-50">
      <div className="flex gap-3">
        <Icon name="archive" className="h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <div className="font-extrabold">{this.archiveChatsConfirmLabel}</div>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">{this.archiveConfirmDescriptionLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" type="button" onClick={() => this.setState({ archiveConfirmOpen: false })}>
          {this.cancelButtonLabel}
        </Button>
        <Button variant="warning" type="button" onClick={this.confirmArchiveChats}>
          {this.archiveConfirmSubmitLabel}
        </Button>
      </div>
    </div>;
  }

  renderNewExecution() {
    const summary = this.getContactSummary();
    const sendDisabled = this.state.selectedAction === 'sendMessage' && (summary.unique === 0 || (this.state.deliveryMode === 'scheduled' && !this.state.scheduledAt));

    return this.renderPanel(<>
      <div>
        <h2 className="text-lg font-extrabold text-white">{this.newExecutionTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{this.newExecutionSubtitle}</p>
      </div>
      <div className="mt-5">
        <label className="sr-only" htmlFor="popup-action">{this.selectFunctionLabel}</label>
        {this.renderActionSelector()}
        {this.renderActionFields()}
        {this.renderArchiveConfirmation()}
        {this.renderConnectionNotice()}
        <Button
          className="mt-4 w-full"
          variant="primary"
          type="button"
          disabled={this.state.labLoading || sendDisabled}
          onClick={this.executeSelectedAction}
          icon={<Icon name="play" className="h-5 w-5" />}
        >
          {this.state.labLoading ? this.sendingPopup : this.executeButtonLabel}
        </Button>
      </div>
    </>);
  }

  renderQuickAction(action: PopupAction, title: string, description: string, icon: UiIcon, className = '') {
    const active = this.state.selectedAction === action;
    return <button
      type="button"
      onClick={() => this.selectQuickAction(action)}
      className={[
        'group flex min-h-[8.25rem] flex-col items-center justify-center rounded-xl border p-4 text-center transition',
        className,
        active
          ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_18px_38px_rgba(16,185,129,.12)]'
          : 'border-white/10 bg-slate-950/22 hover:border-emerald-400/35 hover:bg-white/10'
      ].join(' ')}
    >
      <Icon name={icon} className="h-9 w-9 text-emerald-300 transition group-hover:scale-105" />
      <div className="mt-4 text-sm font-extrabold text-white">{title}</div>
      <div className="mt-1 text-xs leading-4 text-slate-400">{description}</div>
    </button>;
  }

  renderQuickExecutions() {
    return this.renderPanel(<>
      <h2 className="text-lg font-extrabold text-white">{this.quickExecutionsTitle}</h2>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {this.renderQuickAction('sendMessage', this.functionSendMessageLabel, this.functionSendMessageDescription, 'send')}
        {this.renderQuickAction('archiveChats', this.functionArchiveChatsLabel, this.functionArchiveChatsDescription, 'archive')}
        {this.renderQuickAction('listChats', this.functionListChatsLabel, this.functionListChatsDescription, 'list')}
        {this.renderQuickAction('queryContact', this.functionVerifyNumberLabel, this.functionVerifyNumberDescription, 'search')}
        {this.renderQuickAction('allWaJsFunctions', this.allWaJsFunctionsLabel, this.allWaJsFunctionsDescription, 'zap', 'col-span-4 min-h-[6rem] flex-row gap-4 text-left')}
      </div>
    </>);
  }

  renderSummary() {
    const summary = this.getSummary();

    return this.renderPanel(<>
      <h2 className="text-lg font-extrabold text-white">{this.summaryTitle}</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {this.renderMetric(this.todaySentLabel, summary.sentToday, 'send', 'text-emerald-300')}
        {this.renderMetric(this.duplicatesTodayLabel, summary.duplicates, 'alert', 'text-amber-300')}
        {this.renderMetric(this.completedThisMonthLabel, summary.completed, 'check', 'text-emerald-300')}
      </div>
    </>);
  }

  renderLatestExecutions(limit = 3) {
    const logs = this.state.logs.slice(-limit).reverse();

    return <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-white">{this.latestExecutionsTitle}</h2>
        <button type="button" onClick={() => this.setState({ activeTab: 'history' })} className="text-sm font-bold text-emerald-300 transition hover:text-emerald-200">
          {this.viewAllLabel}
        </button>
      </div>
      <div className="space-y-2">
        {logs.length === 0 && <div className="rounded-xl border border-dashed border-white/12 bg-slate-900/32 p-5 text-center text-sm text-slate-400">{this.noRecentExecutionsLabel}</div>}
        {logs.map((log, index) => this.renderHistoryRow(log, index))}
      </div>
    </section>;
  }

  renderHistoryRow(log: Log, index: number) {
    const isSuccess = log.level === 3;
    const isWarning = log.level === 2;
    const icon: UiIcon = isSuccess ? 'check' : isWarning ? 'alert' : 'message';
    const color = isSuccess ? 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/25' : isWarning ? 'text-amber-300 bg-amber-400/10 ring-amber-400/25' : 'text-rose-300 bg-rose-400/10 ring-rose-400/25';
    const badge = isSuccess ? this.readyToSendLabel : isWarning ? this.duplicatedContactsPopup.replace(':', '') : this.messagesNotSentPopup.replace(':', '');

    return <div key={`${log.date}-${log.contact}-${index}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-slate-800/42 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ${color}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold text-white">{log.message}</div>
        <div className="truncate text-xs text-slate-400">{log.contact || '-'}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline ${isSuccess ? 'bg-emerald-400/12 text-emerald-300' : isWarning ? 'bg-amber-400/12 text-amber-300' : 'bg-rose-400/12 text-rose-300'}`}>{badge}</span>
        <span className="w-20 truncate text-right text-xs text-slate-400">{log.date}</span>
      </div>
    </div>;
  }

  renderExecutions() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderNewExecution()}
      {this.renderQuickExecutions()}
      {this.renderSummary()}
      {this.renderLatestExecutions()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderHistory() {
    return <div className="space-y-5 px-7 pb-6">
      {this.state.labResult && this.renderLabResult()}
      {this.renderPanel(<>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">{this.latestExecutionsTitle}</h2>
          <Button variant="ghost" type="button" onClick={this.updateLogs} icon={<Icon name="refresh" className="h-4 w-4" />}>
            {chrome.i18n.getMessage('updateButtonLabel') || 'Update'}
          </Button>
        </div>
        <div className="mt-4 max-h-[27rem] space-y-2 overflow-auto pr-1">
          {this.state.logs.length === 0 && <div className="rounded-xl border border-dashed border-white/12 bg-slate-950/30 p-6 text-center text-sm text-slate-400">{this.noRecentExecutionsLabel}</div>}
          {this.state.logs.slice().reverse().map((log, index) => this.renderHistoryRow(log, index))}
        </div>
      </>)}
    </div>;
  }

  renderLabResult() {
    const resultText = this.state.labResult ? JSON.stringify(this.state.labResult, null, 2) : this.wajsLabPlaceholderResult;

    return this.renderPanel(<>
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white">
        <Icon name="zap" className="h-5 w-5 text-emerald-300" />
        {this.wajsLabResultLabel}
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-5 text-emerald-100">{resultText}</pre>
    </>);
  }

  renderProgressShell(title: string, label: string, progress: number, metrics: ReactNode, cancel: () => void, done: () => void, isProcessing?: boolean, currentChat?: string) {
    return this.renderShell(<div className="px-7 pb-6">
      {this.renderPanel(<>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">{title}</h2>
            <p className="mt-1 max-w-[25rem] truncate text-sm text-slate-400">{label}</p>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-300">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-950/70 ring-1 ring-white/10">
          <div
            className={`h-full rounded-full progress-bar${isProcessing ? ' progress-bar-animated' : ''}`}
            style={{ width: `${Math.max(progress, isProcessing && progress === 0 ? 8 : progress)}%` }}
          ></div>
        </div>
        {currentChat && <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
          <span className="font-bold">{this.archiveCurrentChatLabel}: </span>
          <span className="font-mono">{currentChat}</span>
        </div>}
        <div className="mt-5 grid grid-cols-2 gap-3">{metrics}</div>
        <Button className="mt-5 w-full" variant={isProcessing ? 'danger' : 'primary'} type="button" onClick={isProcessing ? cancel : done}>
          {isProcessing ? this.cancelButtonLabel : this.okButtonLabel}
        </Button>
      </>)}
    </div>);
  }

  renderSendProgress() {
    const progress = this.getProgress();
    const status = this.state.status;

    return this.renderProgressShell(
      status?.isProcessing ? this.sendingMessagePopup : this.queueFinishedLabel,
      status?.isProcessing ? this.sendingPopup : this.readyToSendLabel,
      progress,
      <>
        {this.renderMiniMetric(this.messageTimePopup, this.formatTime(status?.elapsedTime || 0))}
        {status?.waiting ? this.renderMiniMetric(this.waitingPopup, this.formatTime(status.waiting)) : this.renderMiniMetric(this.duplicatedContactsPopup, this.state.duplicatedContacts)}
        {this.renderMiniMetric(this.messagesSentPopup, status?.processedItems || 0)}
        {this.renderMiniMetric(status?.isProcessing ? this.messagesLeftPopup : this.messagesNotSentPopup, status?.remainingItems || 0)}
      </>,
      () => PopupMessageManager.sendMessage(ChromeMessageTypes.STOP_QUEUE, undefined),
      () => this.setState({ confirmed: true, activeOperation: undefined }),
      status?.isProcessing
    );
  }

  renderArchiveProgress() {
    const progress = this.getArchiveProgress();
    const archiveStatus = this.state.archiveStatus;
    const isIndeterminate = Boolean(archiveStatus?.isProcessing && archiveStatus.totalItems === 0);

    return this.renderProgressShell(
      this.getArchiveTitle(),
      this.getArchiveProgressLabel(),
      isIndeterminate ? 0 : progress,
      <>
        {this.renderMiniMetric(this.messageTimePopup, this.formatTime(archiveStatus?.elapsedTime || 0))}
        {archiveStatus?.waiting ? this.renderMiniMetric(this.waitingPopup, this.formatTime(archiveStatus.waiting)) : this.renderMiniMetric(this.archiveFailedLabel, archiveStatus?.failedItems || 0)}
        {this.renderMiniMetric(this.archivedChatsLabel, archiveStatus?.processedItems || 0)}
        {this.renderMiniMetric(this.messagesLeftPopup, archiveStatus?.remainingItems || 0)}
      </>,
      () => PopupMessageManager.sendMessage(ChromeMessageTypes.STOP_QUEUE, undefined),
      () => this.setState({ confirmed: true, activeOperation: undefined }),
      archiveStatus?.isProcessing,
      archiveStatus?.currentChat
    );
  }

  render() {
    if (this.state.activeOperation === 'archive') return this.renderArchiveProgress();
    if (this.state.activeOperation === 'send' || !this.state.confirmed) return this.renderSendProgress();

    return this.renderShell(this.state.activeTab === 'executions' ? this.renderExecutions() : this.renderHistory());
  }
}

createRoot(document.getElementById('root')!)
  .render(<Popup />);
