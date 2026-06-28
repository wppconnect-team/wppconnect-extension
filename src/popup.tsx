import React, { ChangeEvent, Component, FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Button from './components/atoms/Button';
import { ControlInput, ControlTextArea } from './components/atoms/ControlFactory';
import ArchiveStatus from './types/ArchiveStatus';
import Log from './types/Log';
import QueueStatus from './types/QueueStatus';
import type { Attachment } from './types/Attachment';
import type { ScheduledExecution } from './types/ScheduledExecution';
import { WaJsLabAction, WaJsLabMediaType, WaJsLabPayload, WaJsLabResponse } from './types/WaJsLab';
import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';
import { getActiveLanguage, initI18n } from './utils/i18n';
import ArchiveForm from './components/organisms/ArchiveForm';
import LanguageForm from './components/organisms/LanguageForm';
import MessageButtonsForm from './components/organisms/MessageButtonsForm';
import MessageForm from './components/organisms/MessageForm';

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

type PopupTab =
  | 'modules'
  | 'waExecutions'
  | 'messageTemplates'
  | 'broadcasts'
  | 'automations'
  | 'utilities'
  | 'webhooksApi'
  | 'improvements'
  | 'businessTools'
  | 'export'
  | 'statistics'
  | 'history'
  | 'settings';
type PopupAction =
  | 'sendMessage'
  | 'archiveChats'
  | 'diagnostics'
  | 'listChats'
  | 'listUnreadChats'
  | 'activeChat'
  | 'queryContact'
  | 'openChat'
  | 'openNewChat'
  | 'markRead'
  | 'markUnread'
  | 'pinChat'
  | 'muteChat'
  | 'sendText'
  | 'sendImage'
  | 'sendAudio'
  | 'sendVideo'
  | 'sendDocument'
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
type BulkDraft = {
  message: string,
  attachment: Attachment,
  buttons: unknown[],
  delay: number,
  prefix: number
};
type MessageTemplate = {
  id: string,
  name: string,
  message: string,
  attachment: Attachment,
  buttons: unknown[],
  delay: number,
  prefix: number,
  createdAt: number,
  updatedAt: number
};
type WebhookConfig = {
  enabled: boolean,
  url: string,
  secret: string
};
type ExtensionUpdateInfo = {
  currentVersion: string,
  latestVersion?: string,
  latestTag?: string,
  releaseUrl?: string,
  assetUrl?: string,
  publishedAt?: string,
  updateAvailable?: boolean,
  checkedAt: number
};

type PopupState = {
  contacts: string,
  duplicatedContacts: number,
  status?: QueueStatus,
  archiveStatus?: ArchiveStatus,
  confirmed: boolean,
  archiveConfirmOpen: boolean,
  connectionError?: string,
  connectionChecking: boolean,
  connectionReady?: boolean,
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
  labAttachment: Attachment,
  deliveryMode: DeliveryMode,
  scheduledAt: string,
  scheduledExecutions: ScheduledExecution[],
  labLoading: boolean,
  operationMode?: 'scheduling' | 'executing',
  labResult?: WaJsLabResponse,
  logs: Log[],
  activeOperation?: 'send' | 'archive',
  selectedHistoryLogKey?: string,
  bulkDraft: BulkDraft,
  messageTemplates: MessageTemplate[],
  templateName: string,
  webhookConfig: WebhookConfig,
  updateChecking: boolean,
  updateInfo?: ExtensionUpdateInfo,
  updateError?: string
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
  | 'pin'
  | 'image'
  | 'audio'
  | 'video'
  | 'file'
  | 'trash';

const EXTENSION_REPO = 'wppconnect-team/wppconnect-extension';
const EXTENSION_RELEASES_URL = `https://github.com/${EXTENSION_REPO}/releases`;
const EXTENSION_LATEST_RELEASE_API = `https://api.github.com/repos/${EXTENSION_REPO}/releases/latest`;

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
    pin: <><path d="m15 4 5 5-4 1-4 6-2-2-5 5 5-5-2-2 6-4 1-4Z" /></>,
    image: <><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="m3 16 5-5 4 4 2-2 7 7" /><path d="M14 8h.01" /></>,
    audio: <><path d="M9 18V5l12-2v13" /><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></>,
    video: <><path d="M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /><path d="m17 10 5-3v10l-5-3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></>
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
      connectionChecking: false,
      connectionReady: undefined,
      activeTab: 'modules',
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
      labAttachment: null,
      deliveryMode: 'now',
      scheduledAt: '',
      scheduledExecutions: [],
      labLoading: false,
      operationMode: undefined,
      labResult: undefined,
      logs: [],
      activeOperation: undefined,
      selectedHistoryLogKey: undefined,
      bulkDraft: {
        message: chrome.i18n.getMessage('defaultMessage') || '',
        attachment: null,
        buttons: [],
        delay: 0,
        prefix: getActiveLanguage() === 'pt_BR' ? 55 : 0
      },
      messageTemplates: [],
      templateName: '',
      webhookConfig: {
        enabled: false,
        url: '',
        secret: ''
      },
      updateChecking: false,
      updateInfo: undefined,
      updateError: undefined
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
  archiveInspectedChatsLabel = chrome.i18n.getMessage('archiveInspectedChatsLabel') || 'inspected chats';
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
  modulesHomeLabel = chrome.i18n.getMessage('modulesHomeLabel') || 'Modules';
  backToModulesLabel = chrome.i18n.getMessage('backToModulesLabel') || 'Back to modules';
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
  connectionCheckingLabel = chrome.i18n.getMessage('connectionCheckingLabel') || 'Checking connection...';
  connectionStillLoadingLabel = chrome.i18n.getMessage('connectionStillLoadingLabel') || 'WhatsApp is still loading chats. Wait for the chat list to appear and try again.';
  connectionRuntimeUnavailableLabel = chrome.i18n.getMessage('connectionRuntimeUnavailableLabel') || 'WA-JS is not ready in this tab yet. Reload WhatsApp Web and try again.';
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
  functionOpenNewChatLabel = chrome.i18n.getMessage('functionOpenNewChatLabel') || 'Open new chat';
  functionMarkReadLabel = chrome.i18n.getMessage('functionMarkReadLabel') || 'Mark read';
  functionMarkUnreadLabel = chrome.i18n.getMessage('functionMarkUnreadLabel') || 'Mark unread';
  functionPinChatLabel = chrome.i18n.getMessage('functionPinChatLabel') || 'Pin chat';
  functionMuteChatLabel = chrome.i18n.getMessage('functionMuteChatLabel') || 'Mute chat';
  functionSendTextLabel = chrome.i18n.getMessage('functionSendTextLabel') || 'Send text';
  functionSendImageLabel = chrome.i18n.getMessage('functionSendImageLabel') || 'Send image';
  functionSendAudioLabel = chrome.i18n.getMessage('functionSendAudioLabel') || 'Send audio';
  functionSendVideoLabel = chrome.i18n.getMessage('functionSendVideoLabel') || 'Send video';
  functionSendDocumentLabel = chrome.i18n.getMessage('functionSendDocumentLabel') || 'Send document';
  functionSendMessageDescription = chrome.i18n.getMessage('functionSendMessageDescription') || 'For contacts or lists';
  functionArchiveChatsDescription = chrome.i18n.getMessage('functionArchiveChatsDescription') || 'Archive non-archived chats';
  functionListChatsDescription = chrome.i18n.getMessage('functionListChatsDescription') || 'Inspect available chats';
  functionVerifyNumberDescription = chrome.i18n.getMessage('functionVerifyNumberDescription') || 'Check contact existence';
  functionOpenNewChatDescription = chrome.i18n.getMessage('functionOpenNewChatDescription') || 'Open a chat, or send when text is filled';
  productModulesTitle = chrome.i18n.getMessage('productModulesTitle') || 'Product modules';
  productModulesSubtitle = chrome.i18n.getMessage('productModulesSubtitle') || 'What already exists and what comes next';
  productModuleReadyLabel = chrome.i18n.getMessage('productModuleReadyLabel') || 'Ready';
  productModuleNextLabel = chrome.i18n.getMessage('productModuleNextLabel') || 'Next';
  moduleWaExecutionsTitle = chrome.i18n.getMessage('moduleWaExecutionsTitle') || 'WA Executions';
  moduleWaExecutionsDescription = chrome.i18n.getMessage('moduleWaExecutionsDescription') || 'Run, schedule and inspect WA-JS actions.';
  moduleMessageTemplatesTitle = chrome.i18n.getMessage('moduleMessageTemplatesTitle') || 'Message templates';
  moduleMessageTemplatesDescription = chrome.i18n.getMessage('moduleMessageTemplatesDescription') || 'Saved message, files and buttons.';
  moduleBroadcastsTitle = chrome.i18n.getMessage('moduleBroadcastsTitle') || 'Broadcasts';
  moduleBroadcastsDescription = chrome.i18n.getMessage('moduleBroadcastsDescription') || 'Run personalized campaigns.';
  moduleAutomationsTitle = chrome.i18n.getMessage('moduleAutomationsTitle') || 'Automations';
  moduleAutomationsDescription = chrome.i18n.getMessage('moduleAutomationsDescription') || 'Schedule any execution.';
  moduleUtilitiesTitle = chrome.i18n.getMessage('moduleUtilitiesTitle') || 'Tools and utilities';
  moduleUtilitiesDescription = chrome.i18n.getMessage('moduleUtilitiesDescription') || 'Open chats, verify numbers and inspect chats.';
  moduleWebhooksApiTitle = chrome.i18n.getMessage('moduleWebhooksApiTitle') || 'Webhooks and API';
  moduleWebhooksApiDescription = chrome.i18n.getMessage('moduleWebhooksApiDescription') || 'Runtime WA-JS bridge is ready; external API is next.';
  moduleImprovementsTitle = chrome.i18n.getMessage('moduleImprovementsTitle') || 'Improvements';
  moduleImprovementsDescription = chrome.i18n.getMessage('moduleImprovementsDescription') || 'Chat productivity actions.';
  moduleBusinessToolsTitle = chrome.i18n.getMessage('moduleBusinessToolsTitle') || 'Business tools';
  moduleBusinessToolsDescription = chrome.i18n.getMessage('moduleBusinessToolsDescription') || 'Profiles, vCards and media sending.';
  moduleExportTitle = chrome.i18n.getMessage('moduleExportTitle') || 'Export';
  moduleExportDescription = chrome.i18n.getMessage('moduleExportDescription') || 'Data export workspace to build next.';
  moduleStatsTitle = chrome.i18n.getMessage('moduleStatsTitle') || 'Statistics';
  moduleStatsDescription = chrome.i18n.getMessage('moduleStatsDescription') || 'History and execution metrics.';
  templatesPanelTitle = chrome.i18n.getMessage('templatesPanelTitle') || 'Message templates';
  templatesPanelSubtitle = chrome.i18n.getMessage('templatesPanelSubtitle') || 'Save the current message setup and reuse it later.';
  templateNameLabel = chrome.i18n.getMessage('templateNameLabel') || 'Template name';
  templateNamePlaceholder = chrome.i18n.getMessage('templateNamePlaceholder') || 'Ex: First contact';
  saveTemplateLabel = chrome.i18n.getMessage('saveTemplateLabel') || 'Save template';
  applyTemplateLabel = chrome.i18n.getMessage('applyTemplateLabel') || 'Apply';
  deleteTemplateLabel = chrome.i18n.getMessage('deleteTemplateLabel') || 'Delete';
  templatesEmptyLabel = chrome.i18n.getMessage('templatesEmptyLabel') || 'No templates saved yet.';
  templateSavedLabel = chrome.i18n.getMessage('templateSavedLabel') || 'Template saved';
  templateAppliedLabel = chrome.i18n.getMessage('templateAppliedLabel') || 'Template applied';
  templateDeletedLabel = chrome.i18n.getMessage('templateDeletedLabel') || 'Template deleted';
  webhookPanelTitle = chrome.i18n.getMessage('webhookPanelTitle') || 'Webhooks and page API';
  webhookPanelSubtitle = chrome.i18n.getMessage('webhookPanelSubtitle') || 'Send execution events to your endpoint and copy a browser API example.';
  webhookEnabledLabel = chrome.i18n.getMessage('webhookEnabledLabel') || 'Webhook enabled';
  webhookDisabledLabel = chrome.i18n.getMessage('webhookDisabledLabel') || 'Webhook disabled';
  webhookUrlLabel = chrome.i18n.getMessage('webhookUrlLabel') || 'Webhook URL';
  webhookSecretLabel = chrome.i18n.getMessage('webhookSecretLabel') || 'Secret header';
  webhookSecretPlaceholder = chrome.i18n.getMessage('webhookSecretPlaceholder') || 'Optional shared secret';
  generateSecretLabel = chrome.i18n.getMessage('generateSecretLabel') || 'Generate';
  saveWebhookLabel = chrome.i18n.getMessage('saveWebhookLabel') || 'Save webhook';
  testWebhookLabel = chrome.i18n.getMessage('testWebhookLabel') || 'Send test';
  webhookSavedLabel = chrome.i18n.getMessage('webhookSavedLabel') || 'Webhook saved';
  webhookTestLabel = chrome.i18n.getMessage('webhookTestLabel') || 'Webhook test event';
  pageApiExampleLabel = chrome.i18n.getMessage('pageApiExampleLabel') || 'Page API example';
  exportPanelTitle = chrome.i18n.getMessage('exportPanelTitle') || 'Export';
  exportPanelSubtitle = chrome.i18n.getMessage('exportPanelSubtitle') || 'Download local extension data.';
  exportAllJsonLabel = chrome.i18n.getMessage('exportAllJsonLabel') || 'Export all JSON';
  exportLogsCsvLabel = chrome.i18n.getMessage('exportLogsCsvLabel') || 'Export logs CSV';
  exportSchedulesJsonLabel = chrome.i18n.getMessage('exportSchedulesJsonLabel') || 'Export schedules JSON';
  exportTemplatesJsonLabel = chrome.i18n.getMessage('exportTemplatesJsonLabel') || 'Export templates JSON';
  exportDoneLabel = chrome.i18n.getMessage('exportDoneLabel') || 'Export generated';
  statsPanelTitle = chrome.i18n.getMessage('statsPanelTitle') || 'Statistics';
  statsPanelSubtitle = chrome.i18n.getMessage('statsPanelSubtitle') || 'Operational view of executions, schedules and assets.';
  successRateLabel = chrome.i18n.getMessage('successRateLabel') || 'Success rate';
  failedExecutionsLabel = chrome.i18n.getMessage('failedExecutionsLabel') || 'Failed';
  warningExecutionsLabel = chrome.i18n.getMessage('warningExecutionsLabel') || 'Warnings';
  scheduledPendingMetricLabel = chrome.i18n.getMessage('scheduledPendingMetricLabel') || 'Pending';
  scheduledRunningMetricLabel = chrome.i18n.getMessage('scheduledRunningMetricLabel') || 'Running';
  uniqueTargetsLabel = chrome.i18n.getMessage('uniqueTargetsLabel') || 'Unique targets';
  templatesMetricLabel = chrome.i18n.getMessage('templatesMetricLabel') || 'Templates';
  webhookMetricLabel = chrome.i18n.getMessage('webhookMetricLabel') || 'Webhook';
  enabledLabel = chrome.i18n.getMessage('enabledLabel') || 'Enabled';
  disabledLabel = chrome.i18n.getMessage('disabledLabel') || 'Disabled';
  functionRequiresChatLabel = chrome.i18n.getMessage('functionRequiresChatLabel') || 'Chat ID or phone';
  functionRequiresContactLabel = chrome.i18n.getMessage('functionRequiresContactLabel') || 'Contact ID or phone';
  functionRequiresTextLabel = chrome.i18n.getMessage('functionRequiresTextLabel') || 'Message text';
  optionalFieldLabel = chrome.i18n.getMessage('optionalFieldLabel') || 'optional';
  functionRequiresAttachmentLabel = chrome.i18n.getMessage('functionRequiresAttachmentLabel') || 'File';
  functionAttachmentHelpLabel = chrome.i18n.getMessage('functionAttachmentHelpLabel') || 'Choose the media file for this execution.';
  removeAttachmentLabel = chrome.i18n.getMessage('removeAttachmentLabel') || 'Remove';
  bulkCaptureTargetsLabel = chrome.i18n.getMessage('bulkCaptureTargetsLabel') || 'Capture chats/contacts';
  bulkSpamWarningLabel = chrome.i18n.getMessage('bulkSpamWarningLabel') || 'WhatsApp is increasingly strict with exaggerated spam. Use conservative volumes, consented contacts and realistic delays.';
  deliveryModeLabel = chrome.i18n.getMessage('deliveryModeLabel') || 'Delivery';
  sendNowLabel = chrome.i18n.getMessage('sendNowLabel') || 'Send now';
  scheduleMessageLabel = chrome.i18n.getMessage('scheduleMessageLabel') || 'Schedule';
  scheduleDateLabel = chrome.i18n.getMessage('scheduleDateLabel') || 'Date and time';
  scheduledQueueLabel = chrome.i18n.getMessage('scheduledQueueLabel') || 'Scheduled in the WhatsApp Web tab. Keep it open and connected.';
  scheduledExecutionsTitle = chrome.i18n.getMessage('scheduledExecutionsTitle') || 'Scheduled executions';
  scheduledExecutionsEmptyLabel = chrome.i18n.getMessage('scheduledExecutionsEmptyLabel') || 'No scheduled executions yet.';
  scheduledExecutionPendingLabel = chrome.i18n.getMessage('scheduledExecutionPendingLabel') || 'Scheduled';
  scheduledExecutionRunningLabel = chrome.i18n.getMessage('scheduledExecutionRunningLabel') || 'Running';
  scheduledExecutionCompletedLabel = chrome.i18n.getMessage('scheduledExecutionCompletedLabel') || 'Completed';
  scheduledExecutionFailedLabel = chrome.i18n.getMessage('scheduledExecutionFailedLabel') || 'Failed';
  scheduledExecutionCancelledLabel = chrome.i18n.getMessage('scheduledExecutionCancelledLabel') || 'Cancelled';
  cancelScheduledExecutionLabel = chrome.i18n.getMessage('cancelScheduledExecutionLabel') || 'Cancel';
  schedulingLoadingLabel = chrome.i18n.getMessage('schedulingLoadingLabel') || 'Scheduling...';
  executingLoadingLabel = chrome.i18n.getMessage('executingLoadingLabel') || 'Executing...';
  scheduledDetailsTitle = chrome.i18n.getMessage('scheduledDetailsTitle') || 'Schedule details';
  scheduledDetailsEmptyLabel = chrome.i18n.getMessage('scheduledDetailsEmptyLabel') || 'Select a scheduled execution to inspect it.';
  scheduledDetailsFunctionLabel = chrome.i18n.getMessage('scheduledDetailsFunctionLabel') || 'Function';
  scheduledDetailsTargetLabel = chrome.i18n.getMessage('scheduledDetailsTargetLabel') || 'Target';
  scheduledDetailsStatusLabel = chrome.i18n.getMessage('scheduledDetailsStatusLabel') || 'Status';
  scheduledDetailsScheduledForLabel = chrome.i18n.getMessage('scheduledDetailsScheduledForLabel') || 'Scheduled for';
  scheduledDetailsCreatedAtLabel = chrome.i18n.getMessage('scheduledDetailsCreatedAtLabel') || 'Created at';
  scheduledDetailsUpdatedAtLabel = chrome.i18n.getMessage('scheduledDetailsUpdatedAtLabel') || 'Updated at';
  scheduledDetailsPayloadLabel = chrome.i18n.getMessage('scheduledDetailsPayloadLabel') || 'Payload';
  scheduledDetailsResultLabel = chrome.i18n.getMessage('scheduledDetailsResultLabel') || 'Result';
  scheduledDetailsErrorLabel = chrome.i18n.getMessage('scheduledDetailsErrorLabel') || 'Error';
  scheduledDetailsCloseLabel = chrome.i18n.getMessage('scheduledDetailsCloseLabel') || 'Close details';
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
  settingsBackLabel = chrome.i18n.getMessage('settingsBackLabel') || 'Back';
  optionsPageTitle = chrome.i18n.getMessage('optionsPageTitle') || 'Wppconnect settings';
  optionsPageSubtitle = chrome.i18n.getMessage('optionsPageSubtitle') || 'Prepare the message, delivery controls and send logs.';
  manualUpdateTitle = chrome.i18n.getMessage('manualUpdateTitle') || 'Manual update';
  manualUpdateSubtitle = chrome.i18n.getMessage('manualUpdateSubtitle') || 'Use GitHub releases while the Chrome Web Store listing is not approved.';
  currentVersionLabel = chrome.i18n.getMessage('currentVersionLabel') || 'Current version';
  latestVersionLabel = chrome.i18n.getMessage('latestVersionLabel') || 'Latest version';
  checkUpdateLabel = chrome.i18n.getMessage('checkUpdateLabel') || 'Check update';
  checkingUpdateLabel = chrome.i18n.getMessage('checkingUpdateLabel') || 'Checking...';
  updateAvailableLabel = chrome.i18n.getMessage('updateAvailableLabel') || 'Update available';
  extensionUpToDateLabel = chrome.i18n.getMessage('extensionUpToDateLabel') || 'Extension is up to date';
  openReleaseLabel = chrome.i18n.getMessage('openReleaseLabel') || 'Open release';
  downloadZipLabel = chrome.i18n.getMessage('downloadZipLabel') || 'Download ZIP';
  updateManualInstallHint = chrome.i18n.getMessage('updateManualInstallHint') || 'Download the ZIP, unzip it, then load the folder again in chrome://extensions.';
  updateCheckFailedLabel = chrome.i18n.getMessage('updateCheckFailedLabel') || 'Could not check updates.';
  bulkMessagePreviewTitle = chrome.i18n.getMessage('bulkMessagePreviewTitle') || 'Message that will be sent';
  bulkChangeMessageLabel = chrome.i18n.getMessage('bulkChangeMessageLabel') || 'Edit message';
  bulkNoAttachmentLabel = chrome.i18n.getMessage('bulkNoAttachmentLabel') || 'No file selected';
  bulkButtonsCountLabel = chrome.i18n.getMessage('bulkButtonsCountLabel') || 'Buttons';
  bulkDelayPreviewLabel = chrome.i18n.getMessage('bulkDelayPreviewLabel') || 'Delay';
  bulkPrefixPreviewLabel = chrome.i18n.getMessage('bulkPrefixPreviewLabel') || 'Prefix';
  selectedAttachmentLabel = chrome.i18n.getMessage('selectedAttachmentLabel') || 'Selected file';

  queueStatusListener = 0;
  archiveStatusListener = 0;
  logListener = 0;
  scheduledStatusListener = 0;

  actions: Array<{ value: PopupAction, label: string, icon: UiIcon, labAction?: WaJsLabAction, needsChat?: boolean, needsContact?: boolean, needsText?: boolean, optionalText?: boolean, needsAttachment?: boolean, mediaType?: WaJsLabMediaType }> = [
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
    { value: 'openNewChat', label: this.functionOpenNewChatLabel, icon: 'message', labAction: 'openNewChat', needsChat: true, optionalText: true },
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
    { value: 'sendImage', label: this.functionSendImageLabel, icon: 'image', labAction: 'sendImage', needsChat: true, optionalText: true, needsAttachment: true, mediaType: 'image' },
    { value: 'sendAudio', label: this.functionSendAudioLabel, icon: 'audio', labAction: 'sendAudio', needsChat: true, needsAttachment: true, mediaType: 'audio' },
    { value: 'sendVideo', label: this.functionSendVideoLabel, icon: 'video', labAction: 'sendVideo', needsChat: true, optionalText: true, needsAttachment: true, mediaType: 'video' },
    { value: 'sendDocument', label: this.functionSendDocumentLabel, icon: 'file', labAction: 'sendDocument', needsChat: true, optionalText: true, needsAttachment: true, mediaType: 'document' },
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
    this.updateScheduledExecutions();
    this.updateBulkDraft();
    this.updateMessageTemplates();
    this.updateWebhookConfig();
    chrome.storage.onChanged.addListener(this.handleStorageChange);
    this.queueStatusListener = window.setInterval(this.updateStatus, 500);
    this.archiveStatusListener = window.setInterval(this.updateArchiveStatus, 500);
    this.logListener = window.setInterval(this.updateLogs, 2500);
    this.scheduledStatusListener = window.setInterval(this.updateScheduledExecutions, 1500);
  }

  componentWillUnmount() {
    clearInterval(this.queueStatusListener);
    clearInterval(this.archiveStatusListener);
    clearInterval(this.logListener);
    clearInterval(this.scheduledStatusListener);
    chrome.storage.onChanged.removeListener(this.handleStorageChange);
  }

  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<PopupState>) {
    if (!prevState.status?.isProcessing && this.state.status?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'send', activeTab: 'waExecutions' });
    }
    if (!prevState.archiveStatus?.isProcessing && this.state.archiveStatus?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'archive', activeTab: 'waExecutions' });
    }
  }

  updateStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.QUEUE_STATUS, undefined).then((status) => {
      this.setState(prevState => ({
        status,
        connectionError: prevState.connectionReady === false ? prevState.connectionError : undefined
      }));
    }).catch((error) => {
      this.setState({
        connectionReady: false,
        connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel
      });
    });
  }

  updateArchiveStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.ARCHIVE_STATUS, undefined).then((archiveStatus) => {
      this.setState(prevState => ({
        archiveStatus,
        connectionError: prevState.connectionReady === false ? prevState.connectionError : undefined
      }));
    }).catch((error) => {
      if (this.state.activeOperation === 'archive') {
        this.setState({
          archiveStatus: createLocalArchiveStatus('error', error instanceof Error ? error.message : this.archiveOpenWhatsAppLabel)
        });
      } else {
        this.setState({
          connectionReady: false,
          connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel
        });
      }
    });
  }

  getConnectionDiagnosticsMessage = (data?: Record<string, unknown>) => {
    if (data?.hasInitialLoadingScreen) return this.connectionStillLoadingLabel;
    return this.connectionRuntimeUnavailableLabel;
  }

  isDiagnosticsReady = (labResult: WaJsLabResponse) => {
    const data = (labResult.data || {}) as Record<string, unknown>;
    const runtimeReady = Boolean(data.isReady || data.hasRequiredRuntimeApi);
    const chatReady = Boolean(data.isMainReady || data.hasChatListElement || data.hasUsableChatStore);
    const authenticated = Boolean(data.isAuthenticated || runtimeReady);
    const loading = Boolean(data.hasInitialLoadingScreen);

    return Boolean(labResult.ok && authenticated && runtimeReady && chatReady && !loading);
  }

  checkConnection = () => {
    this.setState({ connectionChecking: true, connectionError: undefined });
    PopupMessageManager.sendMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, {
      action: 'diagnostics',
      limit: 10
    }).then((labResult) => {
      const ready = this.isDiagnosticsReady(labResult);
      const data = (labResult.data || {}) as Record<string, unknown>;
      this.setState({
        labResult,
        connectionChecking: false,
        connectionReady: ready,
        connectionError: ready ? undefined : labResult.error || this.getConnectionDiagnosticsMessage(data)
      });

      if (ready) {
        this.updateStatus();
        this.updateArchiveStatus();
        this.updateScheduledExecutions();
      }
    }).catch((error) => {
      this.setState({
        connectionChecking: false,
        connectionReady: false,
        connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel
      });
    });
  }

  updateLogs = () => {
    chrome.storage.local.get({ logs: [] }, data => this.setState({ logs: data.logs || [] }));
  }

  updateScheduledExecutions = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.LIST_SCHEDULED_EXECUTIONS, undefined)
      .then((scheduledExecutions) => this.setState({ scheduledExecutions, connectionError: undefined }))
      .catch(() => {
        chrome.storage.local.get({ scheduledExecutions: [] }, data => this.setState({ scheduledExecutions: data.scheduledExecutions || [] }));
      });
  }

  updateBulkDraft = () => {
    const language = getActiveLanguage();
    chrome.storage.local.get({
      message: this.defaultMessage,
      attachment: null,
      buttons: [],
      delay: 0,
      prefix: language === 'pt_BR' ? 55 : 0
    }, data => {
      this.setState({
        bulkDraft: {
          message: data.message,
          attachment: data.attachment,
          buttons: Array.isArray(data.buttons) ? data.buttons : [],
          delay: Number(data.delay) || 0,
          prefix: Number(data.prefix) || 0
        }
      });
    });
  }

  updateMessageTemplates = () => {
    chrome.storage.local.get({ messageTemplates: [] }, data => {
      this.setState({ messageTemplates: Array.isArray(data.messageTemplates) ? data.messageTemplates : [] });
    });
  }

  updateWebhookConfig = () => {
    chrome.storage.local.get({ webhookEnabled: false, webhookUrl: '', webhookSecret: '' }, data => {
      this.setState({
        webhookConfig: {
          enabled: Boolean(data.webhookEnabled),
          url: data.webhookUrl || '',
          secret: data.webhookSecret || ''
        }
      });
    });
  }

  getCurrentExtensionVersion = () => chrome.runtime.getManifest().version || '0.0.0'

  compareVersions = (left: string, right: string) => {
    const parse = (value: string) => value.replace(/^v/i, '').split(/[.-]/).map(part => Number.parseInt(part, 10) || 0);
    const leftParts = parse(left);
    const rightParts = parse(right);
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index++) {
      const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  }

  checkForExtensionUpdate = async () => {
    this.setState({ updateChecking: true, updateError: undefined });

    try {
      const response = await fetch(EXTENSION_LATEST_RELEASE_API, {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      const release = await response.json() as {
        tag_name?: string,
        html_url?: string,
        published_at?: string,
        assets?: Array<{ name?: string, browser_download_url?: string }>
      };
      const currentVersion = this.getCurrentExtensionVersion();
      const latestTag = release.tag_name || currentVersion;
      const latestVersion = latestTag.replace(/^v/i, '');
      const zipAsset = release.assets?.find(asset => asset.name?.endsWith('.zip'));

      this.setState({
        updateChecking: false,
        updateInfo: {
          currentVersion,
          latestVersion,
          latestTag,
          releaseUrl: release.html_url || EXTENSION_RELEASES_URL,
          assetUrl: zipAsset?.browser_download_url,
          publishedAt: release.published_at,
          updateAvailable: this.compareVersions(latestVersion, currentVersion) > 0,
          checkedAt: Date.now()
        }
      });
    } catch (error) {
      this.setState({
        updateChecking: false,
        updateError: error instanceof Error ? error.message : this.updateCheckFailedLabel,
        updateInfo: {
          currentVersion: this.getCurrentExtensionVersion(),
          releaseUrl: EXTENSION_RELEASES_URL,
          checkedAt: Date.now()
        }
      });
    }
  }

  openExternalUrl = (url?: string) => {
    if (!url) return;
    try {
      chrome.tabs.create({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local') return;
    if (['message', 'attachment', 'buttons', 'delay', 'prefix'].some(key => key in changes)) {
      this.updateBulkDraft();
    }
    if ('messageTemplates' in changes) this.updateMessageTemplates();
    if (['webhookEnabled', 'webhookUrl', 'webhookSecret'].some(key => key in changes)) this.updateWebhookConfig();
  }

  addLocalLog = (log: Omit<Log, 'date'>) => {
    chrome.storage.local.get({ logs: [] }, data => {
      const nextLog = {
        id: log.id || `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...log,
        date: new Date().toLocaleString()
      };
      const logs = [
        ...(data.logs || []),
        nextLog
      ].slice(-300);
      chrome.storage.local.set({ logs }, () => {
        this.setState({ logs });
        this.deliverWebhookLog(nextLog);
      });
    });
  }

  deliverWebhookLog = (log: Log) => {
    chrome.storage.local.get({ webhookEnabled: false, webhookUrl: '', webhookSecret: '' }, async data => {
      if (!data.webhookEnabled || !data.webhookUrl) return;

      const payload = JSON.stringify({
        source: 'wppconnect-extension',
        event: 'log.created',
        timestamp: new Date().toISOString(),
        log
      });

      try {
        await fetch(data.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(data.webhookSecret ? { 'X-Wppconnect-Secret': data.webhookSecret } : {})
          },
          body: payload
        });
      } catch (error) {
        try {
          await fetch(data.webhookUrl, { method: 'POST', mode: 'no-cors', body: payload });
        } catch (fallbackError) {
          // Webhooks should never block the popup.
        }
      }
    });
  }

  handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ contacts: event.target.value.replace(/[^\d\n\t,;]*/g, '') });
  }

  handleLabAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      this.setState({ labAttachment: null });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.setState({
        labAttachment: {
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          url: reader.result || ''
        }
      });
    };
    reader.readAsDataURL(file);
  }

  clearLabAttachment = () => {
    this.setState({ labAttachment: null });
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

  saveMessageTemplate = () => {
    const language = getActiveLanguage();
    chrome.storage.local.get({ message: this.defaultMessage, attachment: null, buttons: [], delay: 0, prefix: language === 'pt_BR' ? 55 : 0 }, data => {
      const now = Date.now();
      const name = this.state.templateName.trim() || `${this.moduleMessageTemplatesTitle} ${this.state.messageTemplates.length + 1}`;
      const template: MessageTemplate = {
        id: `template-${now}-${Math.random().toString(16).slice(2)}`,
        name,
        message: data.message || '',
        attachment: data.attachment || null,
        buttons: Array.isArray(data.buttons) ? data.buttons : [],
        delay: Number(data.delay) || 0,
        prefix: Number(data.prefix) || 0,
        createdAt: now,
        updatedAt: now
      };
      const messageTemplates = [template, ...this.state.messageTemplates].slice(0, 30);
      chrome.storage.local.set({ messageTemplates }, () => {
        this.setState({ messageTemplates, templateName: '' });
        this.addLocalLog({ level: 3, message: this.templateSavedLabel, attachment: Boolean(template.attachment), contact: template.name });
      });
    });
  }

  applyMessageTemplate = (template: MessageTemplate) => {
    chrome.storage.local.set({
      message: template.message,
      attachment: template.attachment,
      buttons: template.buttons,
      delay: template.delay,
      prefix: template.prefix
    }, () => {
      this.updateBulkDraft();
      this.addLocalLog({ level: 3, message: this.templateAppliedLabel, attachment: Boolean(template.attachment), contact: template.name });
    });
  }

  deleteMessageTemplate = (id: string) => {
    const template = this.state.messageTemplates.find(item => item.id === id);
    const messageTemplates = this.state.messageTemplates.filter(item => item.id !== id);
    chrome.storage.local.set({ messageTemplates }, () => {
      this.setState({ messageTemplates });
      if (template) this.addLocalLog({ level: 2, message: this.templateDeletedLabel, attachment: Boolean(template.attachment), contact: template.name });
    });
  }

  setWebhookConfig = (patch: Partial<WebhookConfig>) => {
    this.setState(prevState => ({ webhookConfig: { ...prevState.webhookConfig, ...patch } }));
  }

  saveWebhookConfig = () => {
    const { webhookConfig } = this.state;
    chrome.storage.local.set({
      webhookEnabled: webhookConfig.enabled,
      webhookUrl: webhookConfig.url.trim(),
      webhookSecret: webhookConfig.secret.trim()
    }, () => {
      this.updateWebhookConfig();
      this.addLocalLog({ level: 3, message: this.webhookSavedLabel, attachment: false, contact: webhookConfig.url.trim() || '-' });
    });
  }

  generateWebhookSecret = () => {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    this.setWebhookConfig({
      secret: Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
    });
  }

  testWebhook = () => {
    const { webhookConfig } = this.state;
    chrome.storage.local.set({
      webhookEnabled: true,
      webhookUrl: webhookConfig.url.trim(),
      webhookSecret: webhookConfig.secret.trim()
    }, () => {
      this.updateWebhookConfig();
      this.addLocalLog({ level: 2, message: this.webhookTestLabel, attachment: false, contact: webhookConfig.url.trim() || '-' });
    });
  }

  escapeCsvValue = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  logsToCsv = (logs: Log[]) => {
    const header = ['date', 'level', 'message', 'contact', 'status', 'scheduledAt'];
    const rows = logs.map(log => [
      log.date || '',
      log.level,
      log.message,
      log.contact,
      log.executionDetails?.status || '',
      log.executionDetails?.scheduledAt ? new Date(log.executionDetails.scheduledAt).toISOString() : ''
    ]);
    return [header, ...rows].map(row => row.map(value => this.escapeCsvValue(value)).join(',')).join('\n');
  }

  downloadTextFile = (fileName: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  exportData = (kind: 'all' | 'logsCsv' | 'scheduled' | 'templates') => {
    chrome.storage.local.get({
      logs: [],
      scheduledExecutions: [],
      messageTemplates: [],
      message: this.defaultMessage,
      attachment: null,
      buttons: [],
      delay: 0,
      prefix: getActiveLanguage() === 'pt_BR' ? 55 : 0,
      webhookEnabled: false,
      webhookUrl: '',
      webhookSecret: ''
    }, data => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (kind === 'logsCsv') {
        this.downloadTextFile(`wppconnect-logs-${stamp}.csv`, this.logsToCsv(data.logs || []), 'text/csv;charset=utf-8');
      } else {
        const payload = kind === 'all'
          ? {
            exportedAt: new Date().toISOString(),
            logs: data.logs || [],
            scheduledExecutions: data.scheduledExecutions || [],
            messageTemplates: data.messageTemplates || [],
            draft: {
              message: data.message,
              attachment: data.attachment,
              buttons: data.buttons,
              delay: data.delay,
              prefix: data.prefix
            },
            webhook: {
              enabled: data.webhookEnabled,
              url: data.webhookUrl,
              hasSecret: Boolean(data.webhookSecret)
            }
          }
          : kind === 'scheduled'
            ? data.scheduledExecutions || []
            : data.messageTemplates || [];
        this.downloadTextFile(`wppconnect-${kind}-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
      }
      this.addLocalLog({ level: 3, message: this.exportDoneLabel, attachment: false, contact: kind });
    });
  }

  resetSchedulingDefaults = () => ({
    deliveryMode: 'now' as DeliveryMode,
    scheduledAt: ''
  })

  beginOperation = (operationMode: NonNullable<PopupState['operationMode']>) => {
    this.setState({ labLoading: true, operationMode, labResult: undefined, connectionError: undefined });
  }

  finishOperationState = <K extends keyof PopupState = never>(patch?: Pick<PopupState, K>): Pick<PopupState, K | 'deliveryMode' | 'scheduledAt' | 'labLoading' | 'operationMode'> => ({
    ...patch,
    ...this.resetSchedulingDefaults(),
    labLoading: false,
    operationMode: undefined
  }) as Pick<PopupState, K | 'deliveryMode' | 'scheduledAt' | 'labLoading' | 'operationMode'>

  handleScheduledExecutionSaved = <K extends keyof PopupState = never>(scheduledExecution: ScheduledExecution, patch?: Pick<PopupState, K>) => {
    this.setState(prevState => this.finishOperationState({
      ...patch,
      scheduledExecutions: [
        ...prevState.scheduledExecutions.filter(item => item.id !== scheduledExecution.id),
        scheduledExecution
      ],
      connectionError: undefined
    }));
  }

  handleOperationError = (error: unknown, fallback = this.whatsappConnectionHelpLabel) => {
    this.setState(this.finishOperationState({
      connectionError: error instanceof Error ? error.message : fallback
    }));
  }

  startSendMessages = () => {
    this.beginOperation('executing');
    const language = getActiveLanguage();
    chrome.storage.local.get({ message: this.defaultMessage, attachment: null, buttons: [], delay: 0, prefix: language === 'pt_BR' ? 55 : 0 }, async data => {
      const contacts = this.parseContacts(data.prefix);
      if (contacts.length === 0) {
        this.setState(this.finishOperationState());
        return;
      }

      contacts.forEach(contact => {
        PopupMessageManager.sendMessage(ChromeMessageTypes.SEND_MESSAGE, { contact, message: data.message, attachment: data.attachment, buttons: data.buttons, delay: data.delay })
          .catch((error) => this.setState({ connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel }));
      });
      this.setState(this.finishOperationState({ confirmed: false, activeOperation: 'send' }));
    });
  }

  handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.executeSelectedAction();
  }

  confirmArchiveChats = () => {
    this.beginOperation('executing');
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
        .then(() => {
          this.setState(this.finishOperationState());
          this.updateArchiveStatus();
        })
        .catch((error) => {
          this.setState(this.finishOperationState({
            archiveStatus: createLocalArchiveStatus('error', error instanceof Error ? error.message : this.archiveOpenWhatsAppLabel)
          }));
        });
    });
  }

  handleOptions = () => {
    this.setState(prevState => ({
      activeTab: prevState.activeTab === 'settings' ? 'modules' : 'settings',
      actionMenuOpen: false,
      archiveConfirmOpen: false,
      connectionError: undefined
    }));
  }

  getSelectedAction = () => {
    return this.actions.find(action => action.value === this.state.selectedAction);
  }

  getPageTitle = (tab = this.state.activeTab) => {
    switch (tab) {
      case 'waExecutions':
        return this.moduleWaExecutionsTitle;
      case 'messageTemplates':
        return this.moduleMessageTemplatesTitle;
      case 'broadcasts':
        return this.moduleBroadcastsTitle;
      case 'automations':
        return this.moduleAutomationsTitle;
      case 'utilities':
        return this.moduleUtilitiesTitle;
      case 'webhooksApi':
        return this.moduleWebhooksApiTitle;
      case 'improvements':
        return this.moduleImprovementsTitle;
      case 'businessTools':
        return this.moduleBusinessToolsTitle;
      case 'export':
        return this.moduleExportTitle;
      case 'statistics':
        return this.moduleStatsTitle;
      case 'history':
        return this.historyTabLabel;
      case 'settings':
        return this.optionsPageTitle;
      default:
        return this.productModulesTitle;
    }
  }

  getPageDescription = (tab = this.state.activeTab) => {
    switch (tab) {
      case 'waExecutions':
        return this.moduleWaExecutionsDescription;
      case 'messageTemplates':
        return this.moduleMessageTemplatesDescription;
      case 'broadcasts':
        return this.moduleBroadcastsDescription;
      case 'automations':
        return this.moduleAutomationsDescription;
      case 'utilities':
        return this.moduleUtilitiesDescription;
      case 'webhooksApi':
        return this.moduleWebhooksApiDescription;
      case 'improvements':
        return this.moduleImprovementsDescription;
      case 'businessTools':
        return this.moduleBusinessToolsDescription;
      case 'export':
        return this.moduleExportDescription;
      case 'statistics':
        return this.moduleStatsDescription;
      case 'history':
        return this.latestExecutionsTitle;
      case 'settings':
        return this.optionsPageSubtitle;
      default:
        return this.productModulesSubtitle;
    }
  }

  getModuleDefaultAction = (tab: PopupTab): PopupAction | '' => {
    switch (tab) {
      case 'waExecutions':
        return this.state.selectedAction || 'diagnostics';
      case 'broadcasts':
        return 'sendMessage';
      case 'automations':
        return 'allWaJsFunctions';
      case 'utilities':
        return 'openNewChat';
      case 'improvements':
        return 'markRead';
      case 'businessTools':
        return 'businessProfile';
      default:
        return '';
    }
  }

  openModule = (tab: PopupTab) => {
    const defaultAction = this.getModuleDefaultAction(tab);
    this.setState({
      activeTab: tab,
      selectedAction: defaultAction || this.state.selectedAction,
      actionMenuOpen: false,
      archiveConfirmOpen: false,
      connectionError: undefined,
      labText: defaultAction === 'openNewChat' ? '' : this.state.labText
    });
  }

  getLabPayload = (action: WaJsLabAction): WaJsLabPayload => {
    const selectedAction = this.getSelectedAction();
    return {
      action,
      chatId: this.state.labChatId,
      contactId: this.state.labContactId,
      text: this.state.labText,
      limit: this.state.labLimit,
      latitude: Number(this.state.labLatitude),
      longitude: Number(this.state.labLongitude),
      functionPath: this.state.advancedFunctionPath,
      argsJson: this.state.advancedArgsJson,
      attachment: this.state.labAttachment,
      mediaType: selectedAction?.mediaType
    };
  }

  isScheduleInvalid = () => {
    if (this.state.deliveryMode !== 'scheduled') return false;
    if (!this.state.scheduledAt) return true;
    return new Date(this.state.scheduledAt).getTime() <= Date.now();
  }

  isSelectedActionInvalid = () => {
    const selectedAction = this.getSelectedAction();
    if (!selectedAction) return true;
    if (this.isScheduleInvalid()) return true;

    if (selectedAction.value === 'sendMessage') return this.getContactSummary().unique === 0;
    if (selectedAction.value === 'allWaJsFunctions') return !this.state.advancedFunctionPath.trim();
    if (selectedAction.needsChat && !this.state.labChatId.trim()) return true;
    if (selectedAction.needsContact && !this.state.labContactId.trim()) return true;
    if (selectedAction.needsText && !this.state.labText.trim()) return true;
    if (selectedAction.needsAttachment && !this.state.labAttachment) return true;

    return false;
  }

  createScheduledExecution = (label: string, target: string, payload: ScheduledExecution['payload']): ScheduledExecution => ({
    id: `scheduled-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    target,
    payload,
    scheduledAt: new Date(this.state.scheduledAt).getTime(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'scheduled'
  })

  scheduleSelectedAction = (selectedAction: ReturnType<Popup['getSelectedAction']>) => {
    if (!selectedAction || !this.state.scheduledAt) return;

    this.beginOperation('scheduling');

    if (selectedAction.value === 'sendMessage') {
      const language = getActiveLanguage();
      chrome.storage.local.get({ message: this.defaultMessage, attachment: null, buttons: [], delay: 0, prefix: language === 'pt_BR' ? 55 : 0 }, data => {
        const contacts = this.parseContacts(data.prefix);
        if (contacts.length === 0) {
          this.setState(this.finishOperationState());
          return;
        }

        const execution = this.createScheduledExecution(selectedAction.label, `${contacts.length} contato(s)`, {
          kind: 'bulkSend',
          contacts,
          message: data.message,
          attachment: data.attachment,
          buttons: data.buttons,
          delay: data.delay
        });

        PopupMessageManager.sendMessage(ChromeMessageTypes.SCHEDULE_EXECUTION, execution)
          .then((scheduledExecution) => this.handleScheduledExecutionSaved(scheduledExecution))
          .catch((error) => this.handleOperationError(error));
      });
      return;
    }

    if (selectedAction.value === 'archiveChats') {
      chrome.storage.local.get({ archiveDelayMs: 500 }, data => {
        const execution = this.createScheduledExecution(selectedAction.label, '-', {
          kind: 'archiveChats',
          delayMs: data.archiveDelayMs
        });

        PopupMessageManager.sendMessage(ChromeMessageTypes.SCHEDULE_EXECUTION, execution)
          .then((scheduledExecution) => this.handleScheduledExecutionSaved(scheduledExecution, { archiveConfirmOpen: false }))
          .catch((error) => this.handleOperationError(error));
      });
      return;
    }

    const action = selectedAction.value === 'allWaJsFunctions' ? 'executeFunction' : selectedAction.labAction;
    if (!action) {
      this.setState(this.finishOperationState());
      return;
    }

    const execution = this.createScheduledExecution(selectedAction.label, this.getActionHistoryTarget(action), {
      kind: 'wajs',
      labPayload: this.getLabPayload(action)
    });

    PopupMessageManager.sendMessage(ChromeMessageTypes.SCHEDULE_EXECUTION, execution)
      .then((scheduledExecution) => this.handleScheduledExecutionSaved(scheduledExecution))
      .catch((error) => this.handleOperationError(error));
  }

  cancelScheduledExecution = (id: string) => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.CANCEL_SCHEDULED_EXECUTION, { id })
      .then((scheduledExecutions) => this.setState({ scheduledExecutions, connectionError: undefined }))
      .catch((error) => this.setState({ connectionError: error instanceof Error ? error.message : this.whatsappConnectionHelpLabel }));
  }

  executeSelectedAction = () => {
    const selectedAction = this.getSelectedAction();
    if (!selectedAction) {
      this.setState({ connectionError: this.noFunctionSelectedLabel });
      return;
    }

    if (this.state.deliveryMode === 'scheduled') {
      this.scheduleSelectedAction(selectedAction);
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
    const startedAt = Date.now();
    const payload = this.getLabPayload(action);
    const label = this.getActionHistoryLabel(action);
    const target = this.getActionHistoryTarget(action);
    this.beginOperation('executing');
    PopupMessageManager.sendMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, payload).then((labResult) => {
      this.addLocalLog({
        level: labResult.ok ? 3 : 1,
        message: `${label}: ${labResult.ok ? 'OK' : labResult.error || 'Erro'}`,
        attachment: false,
        contact: target,
        executionDetails: {
          label,
          status: labResult.ok ? 'completed' : 'failed',
          target,
          createdAt: startedAt,
          updatedAt: Date.now(),
          payload,
          result: labResult,
          error: labResult.error
        }
      });
      this.setState(this.finishOperationState({ labResult, connectionError: undefined }));
    }).catch((error) => {
      const message = error instanceof Error ? error.message : this.whatsappConnectionHelpLabel;
      this.addLocalLog({
        level: 1,
        message: `${label}: ${message}`,
        attachment: false,
        contact: target,
        executionDetails: {
          label,
          status: 'failed',
          target,
          createdAt: startedAt,
          updatedAt: Date.now(),
          payload,
          error: message
        }
      });
      this.setState(this.finishOperationState({
        connectionError: message,
        labResult: {
          ok: false,
          action,
          durationMs: 0,
          timestamp: new Date().toISOString(),
          error: message
        }
      }));
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
        activeTab: 'waExecutions',
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
    const activeTab = ['modules', 'settings', 'history'].includes(this.state.activeTab)
      ? 'waExecutions'
      : this.state.activeTab;

    this.setState({
      selectedAction: action,
      activeTab,
      archiveConfirmOpen: false,
      connectionError: undefined,
      labText: action === 'openNewChat' ? '' : this.state.labText
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
    const failed = this.state.status?.failedItems || 0;
    const total = this.state.status?.totalItems || processed + failed + (this.state.status?.remainingItems || 0);

    return total === 0 ? 0 : Math.round(((processed + failed) / total) * 100);
  }

  getArchiveProgress = () => {
    const processed = this.state.archiveStatus?.processedItems || 0;
    const failed = this.state.archiveStatus?.failedItems || 0;
    const total = this.state.archiveStatus?.totalItems || 0;

    return total === 0 ? 0 : Math.round(((processed + failed) / total) * 100);
  }

  getDetailedStats = () => {
    const success = this.state.logs.filter(log => log.level === 3).length;
    const failed = this.state.logs.filter(log => log.level === 1).length;
    const warnings = this.state.logs.filter(log => log.level === 2).length;
    const totalFinished = success + failed;
    const scheduledPending = this.state.scheduledExecutions.filter(item => item.status === 'scheduled').length;
    const scheduledRunning = this.state.scheduledExecutions.filter(item => item.status === 'running').length;
    const uniqueTargets = new Set(this.state.logs.map(log => log.contact).filter(Boolean)).size;

    return {
      success,
      failed,
      warnings,
      successRate: totalFinished === 0 ? 0 : Math.round((success / totalFinished) * 100),
      scheduledPending,
      scheduledRunning,
      uniqueTargets,
      templates: this.state.messageTemplates.length,
      webhookEnabled: this.state.webhookConfig.enabled
    };
  }

  getPageApiExample = () => {
    return `window.postMessage({
  source: 'Wppconnect',
  type: 'WAJS_LAB_EXECUTE',
  payload: {
    action: 'sendText',
    chatId: '5511999999999@c.us',
    text: 'Hello from Wppconnect'
  }
}, window.location.origin);`;
  }

  getPrimaryButtonLabel = () => {
    if (this.state.operationMode === 'scheduling') return this.schedulingLoadingLabel;
    if (this.state.operationMode === 'executing') return this.executingLoadingLabel;
    if (this.state.labLoading) return this.sendingPopup;
    return this.state.deliveryMode === 'scheduled' ? this.scheduleMessageLabel : this.executeButtonLabel;
  }

  formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  }

  sanitizeDetailsValue = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => this.sanitizeDetailsValue(item));

    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, entry]) => {
      if (key === 'url') {
        output[key] = typeof entry === 'string' ? `[${entry.length} chars]` : '[binary data]';
        return;
      }
      output[key] = this.sanitizeDetailsValue(entry);
    });
    return output;
  }

  formatDetailsJson = (value: unknown) => {
    try {
      return JSON.stringify(this.sanitizeDetailsValue(value), null, 2);
    } catch (error) {
      return String(value ?? '-');
    }
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
    if (archiveStatus?.phase === 'finished' && archiveStatus.totalItems === 0) {
      return archiveStatus.totalChats
        ? `${this.archiveNoChatsLabel} ${archiveStatus.totalChats} ${this.archiveInspectedChatsLabel}.`
        : this.archiveNoChatsLabel;
    }
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

  isConnectionHealthy = () => this.state.connectionReady === true && !this.state.connectionError;

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
          icon={<Icon name={this.state.activeTab === 'settings' ? 'list' : 'settings'} className="h-5 w-5" />}
        >
          {this.state.activeTab === 'settings' ? this.settingsBackLabel : this.optionsButtonLabel}
        </Button>
      </div>
      {this.state.activeTab !== 'modules' && <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.15rem] bg-slate-950/28 p-2 ring-1 ring-white/7">
        <button
          type="button"
          aria-label={this.backToModulesLabel}
          title={this.backToModulesLabel}
          onClick={() => this.openModule('modules')}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-200"
        >
          <Icon name="list" className="h-5 w-5 text-emerald-300" />
          {this.modulesHomeLabel}
        </button>
        <div className="min-w-0 rounded-xl bg-slate-700/50 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
          <div className="truncate text-sm font-extrabold text-white">{this.getPageTitle()}</div>
          <div className="truncate text-xs text-slate-400">{this.getPageDescription()}</div>
        </div>
      </div>}
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
    const checking = this.state.connectionChecking;
    return <footer className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 px-7 py-4 text-sm text-slate-400">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${checking ? 'bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,.75)]' : healthy ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.85)]' : 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,.65)]'}`}></span>
        <span className="truncate">{checking ? this.connectionCheckingLabel : healthy ? this.whatsappConnectedLabel : this.whatsappNeedsConnectionLabel}</span>
      </div>
      <button
        type="button"
        disabled={checking}
        onClick={this.checkConnection}
        className="inline-flex shrink-0 items-center gap-2 font-semibold text-slate-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checking ? this.connectionCheckingLabel : this.checkConnectionLabel}
        <Icon name="refresh" className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
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
        {this.renderBulkMessagePreview()}
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
      {(selectedAction.needsText || selectedAction.optionalText) && <label className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-300">{selectedAction.optionalText ? `${this.functionRequiresTextLabel} (${this.optionalFieldLabel})` : this.functionRequiresTextLabel}</span>
        <ControlInput value={this.state.labText} onChange={(event) => this.setState({ labText: event.target.value })} />
      </label>}
      {selectedAction.needsAttachment && <label className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-300">{this.functionRequiresAttachmentLabel}</span>
        <ControlInput
          type="file"
          accept={selectedAction.mediaType === 'image' ? 'image/*' : selectedAction.mediaType === 'audio' ? 'audio/*' : selectedAction.mediaType === 'video' ? 'video/*' : undefined}
          onChange={this.handleLabAttachmentChange}
        />
        <span className="text-xs leading-5 text-slate-500">{this.state.labAttachment ? this.state.labAttachment.name : this.functionAttachmentHelpLabel}</span>
        {this.state.labAttachment && <button type="button" onClick={this.clearLabAttachment} className="inline-flex w-max items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200">
          <Icon name="trash" className="h-4 w-4" />
          {this.removeAttachmentLabel}
        </button>}
      </label>}
    </div>;
  }

  renderBulkMessagePreview() {
    const draft = this.state.bulkDraft;
    const attachmentName = draft.attachment?.name || this.bulkNoAttachmentLabel;
    const prefix = draft.prefix === 0 ? chrome.i18n.getMessage('defaultLabelSelectCountryCode') || 'No prefix' : `+${draft.prefix}`;
    const message = draft.message?.trim() || this.defaultMessage || '-';

    return <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-white">
          <Icon name="message" className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="truncate">{this.bulkMessagePreviewTitle}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[2.1rem] shrink-0 px-3 py-1 text-xs"
          onClick={() => this.setState({ activeTab: 'settings', actionMenuOpen: false, archiveConfirmOpen: false })}
          icon={<Icon name="settings" className="h-4 w-4" />}
        >
          {this.bulkChangeMessageLabel}
        </Button>
      </div>
      <div className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm leading-5 text-slate-100">
        {message}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {this.renderMiniMetric(this.selectedAttachmentLabel, attachmentName)}
        {this.renderMiniMetric(this.bulkButtonsCountLabel, draft.buttons.length)}
        {this.renderMiniMetric(this.bulkDelayPreviewLabel, `${draft.delay.toFixed(1)}s`)}
      </div>
      <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-400">
        <span className="font-bold text-slate-300">{this.bulkPrefixPreviewLabel}: </span>{prefix}
      </div>
    </div>;
  }

  renderScheduleControls() {
    if (!this.state.selectedAction) return null;

    return <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3">
      <div className="mb-3 text-sm font-semibold text-slate-300">{this.deliveryModeLabel}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={this.state.labLoading} onClick={() => this.setState({ deliveryMode: 'now' })} className={`rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${this.state.deliveryMode === 'now' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.sendNowLabel}</button>
        <button type="button" disabled={this.state.labLoading} onClick={() => this.setState({ deliveryMode: 'scheduled' })} className={`rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${this.state.deliveryMode === 'scheduled' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.scheduleMessageLabel}</button>
      </div>
      {this.state.deliveryMode === 'scheduled' && <label className="mt-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase text-slate-500">{this.scheduleDateLabel}</span>
        <ControlInput disabled={this.state.labLoading} type="datetime-local" value={this.state.scheduledAt} onChange={(event) => this.setState({ scheduledAt: event.target.value })} />
        <span className="text-xs leading-5 text-slate-500">{this.scheduledQueueLabel}</span>
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
            onClick={() => this.setState({
              selectedAction: action.value,
              actionMenuOpen: false,
              archiveConfirmOpen: false,
              connectionError: undefined,
              labText: action.value === 'openNewChat' ? '' : this.state.labText
            })}
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
      <div className="mt-1 break-words text-lg font-extrabold leading-6 text-white">{value}</div>
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
    const executeDisabled = this.isSelectedActionInvalid();

    return this.renderPanel(<>
      <div>
        <h2 className="text-lg font-extrabold text-white">{this.newExecutionTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{this.newExecutionSubtitle}</p>
      </div>
      <div className="mt-5">
        <label className="sr-only" htmlFor="popup-action">{this.selectFunctionLabel}</label>
        {this.renderActionSelector()}
        {this.renderActionFields()}
        {this.renderScheduleControls()}
        {this.renderArchiveConfirmation()}
        {this.renderConnectionNotice()}
        <Button
          className="mt-4 w-full"
          variant="primary"
          type="button"
          disabled={this.state.labLoading || executeDisabled}
          onClick={this.executeSelectedAction}
          icon={<Icon name={this.state.labLoading ? 'clock' : 'play'} className={`h-5 w-5 ${this.state.labLoading ? 'animate-spin' : ''}`} />}
        >
          {this.getPrimaryButtonLabel()}
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

  renderProductModule(tab: PopupTab, title: string, description: string, icon: UiIcon, status: 'ready' | 'next') {
    const active = this.state.activeTab === tab;
    const statusClass = status === 'ready'
      ? 'bg-emerald-400/12 text-emerald-300'
      : 'bg-amber-400/12 text-amber-300';

    return <button
      type="button"
      onClick={() => this.openModule(tab)}
      className={[
        'group flex min-h-[7.25rem] flex-col rounded-xl border p-4 text-left transition',
        active
          ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_18px_38px_rgba(16,185,129,.12)]'
          : 'border-white/10 bg-slate-950/25 hover:border-emerald-400/35 hover:bg-white/10'
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <Icon name={icon} className="h-5 w-5 transition group-enabled:group-hover:scale-105" />
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase ${statusClass}`}>
          {status === 'ready' ? this.productModuleReadyLabel : this.productModuleNextLabel}
        </span>
      </div>
      <div className="mt-3 text-sm font-extrabold leading-5 text-white">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
    </button>;
  }

  renderProductModules() {
    return this.renderPanel(<>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">{this.productModulesTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">{this.productModulesSubtitle}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {this.renderProductModule('waExecutions', this.moduleWaExecutionsTitle, this.moduleWaExecutionsDescription, 'zap', 'ready')}
        {this.renderProductModule('messageTemplates', this.moduleMessageTemplatesTitle, this.moduleMessageTemplatesDescription, 'message', 'ready')}
        {this.renderProductModule('broadcasts', this.moduleBroadcastsTitle, this.moduleBroadcastsDescription, 'send', 'ready')}
        {this.renderProductModule('automations', this.moduleAutomationsTitle, this.moduleAutomationsDescription, 'clock', 'ready')}
        {this.renderProductModule('utilities', this.moduleUtilitiesTitle, this.moduleUtilitiesDescription, 'search', 'ready')}
        {this.renderProductModule('webhooksApi', this.moduleWebhooksApiTitle, this.moduleWebhooksApiDescription, 'zap', 'ready')}
        {this.renderProductModule('improvements', this.moduleImprovementsTitle, this.moduleImprovementsDescription, 'pin', 'ready')}
        {this.renderProductModule('businessTools', this.moduleBusinessToolsTitle, this.moduleBusinessToolsDescription, 'user', 'ready')}
        {this.renderProductModule('export', this.moduleExportTitle, this.moduleExportDescription, 'file', 'ready')}
        {this.renderProductModule('statistics', this.moduleStatsTitle, this.moduleStatsDescription, 'list', 'ready')}
      </div>
    </>);
  }

  getQuickActionDescription(action: PopupAction) {
    switch (action) {
      case 'sendMessage':
        return this.functionSendMessageDescription;
      case 'archiveChats':
        return this.functionArchiveChatsDescription;
      case 'listChats':
        return this.functionListChatsDescription;
      case 'queryContact':
        return this.functionVerifyNumberDescription;
      case 'openNewChat':
        return this.functionOpenNewChatDescription;
      case 'allWaJsFunctions':
        return this.allWaJsFunctionsDescription;
      default:
        return this.executeButtonLabel;
    }
  }

  renderModuleActions(actions: PopupAction[]) {
    const availableActions = actions
      .map(value => this.actions.find(action => action.value === value))
      .filter((action): action is NonNullable<typeof action> => Boolean(action));

    if (availableActions.length === 0) return null;

    return this.renderPanel(<>
      <h2 className="text-lg font-extrabold text-white">{this.quickExecutionsTitle}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {availableActions.map(action => this.renderQuickAction(action.value, action.label, this.getQuickActionDescription(action.value), action.icon))}
      </div>
    </>);
  }

  renderMessageTemplatesPanel() {
    const draft = this.state.bulkDraft;

    return this.renderPanel(<>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white">{this.templatesPanelTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">{this.templatesPanelSubtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-extrabold text-emerald-300">{this.state.messageTemplates.length}</span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.templateNameLabel}</span>
          <ControlInput value={this.state.templateName} placeholder={this.templateNamePlaceholder} onChange={(event) => this.setState({ templateName: event.target.value })} />
        </label>
        <Button className="self-end" variant="primary" type="button" onClick={this.saveMessageTemplate}>
          {this.saveTemplateLabel}
        </Button>
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/35 p-3 text-xs leading-5 text-slate-400">
        <span className="font-bold text-slate-300">{this.bulkMessagePreviewTitle}: </span>
        <span className="break-words">{draft.message?.trim() || this.defaultMessage || '-'}</span>
      </div>
      <div className="mt-4 space-y-2">
        {this.state.messageTemplates.length === 0 && <div className="rounded-xl border border-dashed border-white/12 bg-slate-950/30 p-5 text-center text-sm text-slate-400">{this.templatesEmptyLabel}</div>}
        {this.state.messageTemplates.map(template => (
          <div key={template.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-white/10 bg-slate-800/42 p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-white">{template.name}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{template.message || '-'}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-bold uppercase text-slate-500">
                <span>{this.bulkButtonsCountLabel}: {template.buttons.length}</span>
                <span>{this.bulkDelayPreviewLabel}: {template.delay.toFixed(1)}s</span>
                <span>{this.bulkPrefixPreviewLabel}: {template.prefix ? `+${template.prefix}` : '-'}</span>
                {template.attachment && <span>{this.selectedAttachmentLabel}: {template.attachment.name}</span>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button className="min-h-[2rem] px-3 py-1 text-xs" variant="glass" type="button" onClick={() => this.applyMessageTemplate(template)}>
                {this.applyTemplateLabel}
              </Button>
              <Button className="min-h-[2rem] px-3 py-1 text-xs" variant="danger" type="button" onClick={() => this.deleteMessageTemplate(template.id)}>
                {this.deleteTemplateLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>);
  }

  renderWebhookApiPanel() {
    const { webhookConfig } = this.state;

    return this.renderPanel(<>
      <div>
        <h2 className="text-lg font-extrabold text-white">{this.webhookPanelTitle}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">{this.webhookPanelSubtitle}</p>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => this.setWebhookConfig({ enabled: true })} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${webhookConfig.enabled ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.webhookEnabledLabel}</button>
          <button type="button" onClick={() => this.setWebhookConfig({ enabled: false })} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${!webhookConfig.enabled ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{this.webhookDisabledLabel}</button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.webhookUrlLabel}</span>
          <ControlInput value={webhookConfig.url} placeholder="https://example.com/webhook" onChange={(event) => this.setWebhookConfig({ url: event.target.value })} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.webhookSecretLabel}</span>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <ControlInput value={webhookConfig.secret} placeholder={this.webhookSecretPlaceholder} onChange={(event) => this.setWebhookConfig({ secret: event.target.value })} />
            <Button variant="ghost" type="button" onClick={this.generateWebhookSecret}>{this.generateSecretLabel}</Button>
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" type="button" onClick={this.saveWebhookConfig}>{this.saveWebhookLabel}</Button>
          <Button variant="glass" type="button" disabled={!webhookConfig.url.trim()} onClick={this.testWebhook}>{this.testWebhookLabel}</Button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">{this.pageApiExampleLabel}</span>
          <ControlTextArea className="min-h-[8rem] resize-y font-mono text-xs" readOnly value={this.getPageApiExample()} />
        </label>
      </div>
    </>);
  }

  renderExportCenter() {
    return this.renderPanel(<>
      <div>
        <h2 className="text-lg font-extrabold text-white">{this.exportPanelTitle}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">{this.exportPanelSubtitle}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="primary" type="button" onClick={() => this.exportData('all')}>{this.exportAllJsonLabel}</Button>
        <Button variant="glass" type="button" onClick={() => this.exportData('logsCsv')}>{this.exportLogsCsvLabel}</Button>
        <Button variant="glass" type="button" onClick={() => this.exportData('scheduled')}>{this.exportSchedulesJsonLabel}</Button>
        <Button variant="glass" type="button" onClick={() => this.exportData('templates')}>{this.exportTemplatesJsonLabel}</Button>
      </div>
    </>);
  }

  renderStatisticsDashboard() {
    const stats = this.getDetailedStats();

    return this.renderPanel(<>
      <div>
        <h2 className="text-lg font-extrabold text-white">{this.statsPanelTitle}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">{this.statsPanelSubtitle}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {this.renderMetric(this.successRateLabel, `${stats.successRate}%`, 'check', 'text-emerald-300')}
        {this.renderMetric(this.failedExecutionsLabel, stats.failed, 'alert', 'text-rose-300')}
        {this.renderMetric(this.warningExecutionsLabel, stats.warnings, 'alert', 'text-amber-300')}
        {this.renderMetric(this.scheduledPendingMetricLabel, stats.scheduledPending, 'clock', 'text-amber-300')}
        {this.renderMetric(this.scheduledRunningMetricLabel, stats.scheduledRunning, 'play', 'text-emerald-300')}
        {this.renderMetric(this.uniqueTargetsLabel, stats.uniqueTargets, 'user', 'text-sky-300')}
        {this.renderMetric(this.templatesMetricLabel, stats.templates, 'message', 'text-emerald-300')}
        {this.renderMetric(this.webhookMetricLabel, stats.webhookEnabled ? this.enabledLabel : this.disabledLabel, 'zap', stats.webhookEnabled ? 'text-emerald-300' : 'text-slate-400')}
        {this.renderMetric(this.completedThisMonthLabel, stats.success, 'check', 'text-emerald-300')}
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

  getScheduledStatusLabel(status: ScheduledExecution['status']) {
    switch (status) {
      case 'running':
        return this.scheduledExecutionRunningLabel;
      case 'completed':
        return this.scheduledExecutionCompletedLabel;
      case 'failed':
        return this.scheduledExecutionFailedLabel;
      case 'cancelled':
        return this.scheduledExecutionCancelledLabel;
      default:
        return this.scheduledExecutionPendingLabel;
    }
  }

  renderScheduledDetailField(label: string, value: ReactNode) {
    return <div className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
      <div className="truncate text-[0.68rem] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-100">{value || '-'}</div>
    </div>;
  }

  getHistoryLogKey(log: Log, index: number) {
    return log.id || `${log.date}-${log.contact}-${index}`;
  }

  getLogStatusLabel(log: Log) {
    if (log.executionDetails?.status && log.executionDetails.status !== 'info') return this.getScheduledStatusLabel(log.executionDetails.status as ScheduledExecution['status']);
    if (log.level === 3) return this.scheduledExecutionCompletedLabel;
    if (log.level === 1) return this.scheduledExecutionFailedLabel;
    return this.scheduledExecutionRunningLabel;
  }

  renderHistoryExecutionDetails(log?: Log) {
    const details = log?.executionDetails;
    return <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-white">{this.scheduledDetailsTitle}</h3>
          {!log && <p className="mt-1 text-xs leading-5 text-slate-400">{this.scheduledDetailsEmptyLabel}</p>}
        </div>
        {log && <button type="button" onClick={() => this.setState({ selectedHistoryLogKey: undefined })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-emerald-400/35 hover:text-emerald-100">
          {this.scheduledDetailsCloseLabel}
        </button>}
      </div>
      {log && <>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {this.renderScheduledDetailField(this.scheduledDetailsFunctionLabel, details?.label || log.message)}
          {this.renderScheduledDetailField(this.scheduledDetailsStatusLabel, this.getLogStatusLabel(log))}
          {this.renderScheduledDetailField(this.scheduledDetailsTargetLabel, details?.target || log.contact || '-')}
          {this.renderScheduledDetailField(this.scheduledDetailsScheduledForLabel, details?.scheduledAt ? this.formatDateTime(details.scheduledAt) : '-')}
          {this.renderScheduledDetailField(this.scheduledDetailsCreatedAtLabel, details?.createdAt ? this.formatDateTime(details.createdAt) : log.date || '-')}
          {this.renderScheduledDetailField(this.scheduledDetailsUpdatedAtLabel, details?.updatedAt ? this.formatDateTime(details.updatedAt) : log.date || '-')}
        </div>
        {(details?.error || log.level === 1) && <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          <div className="font-extrabold text-rose-200">{this.scheduledDetailsErrorLabel}</div>
          <div className="mt-1 break-words">{details?.error || log.message}</div>
        </div>}
        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-2 text-[0.68rem] font-bold uppercase text-slate-500">{this.scheduledDetailsPayloadLabel}</div>
            <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs leading-5 text-slate-200">{this.formatDetailsJson(details?.payload || { message: log.message, contact: log.contact, attachment: log.attachment })}</pre>
          </div>
          {details?.result !== undefined && <div>
            <div className="mb-2 text-[0.68rem] font-bold uppercase text-slate-500">{this.scheduledDetailsResultLabel}</div>
            <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs leading-5 text-slate-200">{this.formatDetailsJson(details.result)}</pre>
          </div>}
        </div>
      </>}
    </div>;
  }

  renderScheduledExecutions() {
    const executions = this.state.scheduledExecutions
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);

    return this.renderPanel(<>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-white">{this.scheduledExecutionsTitle}</h2>
        <Button variant="ghost" type="button" onClick={this.updateScheduledExecutions} icon={<Icon name="refresh" className="h-4 w-4" />}>
          {chrome.i18n.getMessage('updateButtonLabel') || 'Update'}
        </Button>
      </div>
      <div className="max-h-[28rem] space-y-2 overflow-auto pr-1">
        {executions.length === 0 && <div className="rounded-xl border border-dashed border-white/12 bg-slate-900/32 p-5 text-center text-sm text-slate-400">{this.scheduledExecutionsEmptyLabel}</div>}
        {executions.map(execution => {
          const isPending = execution.status === 'scheduled';
          const isFailed = execution.status === 'failed';
          const statusClass = isFailed
            ? 'bg-rose-400/12 text-rose-300'
            : execution.status === 'completed'
              ? 'bg-emerald-400/12 text-emerald-300'
              : execution.status === 'cancelled'
                ? 'bg-slate-400/12 text-slate-300'
                : 'bg-amber-400/12 text-amber-300';

          return <div key={execution.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-slate-800/42 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25">
              <Icon name="clock" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-white">{execution.label}</div>
              <div className="truncate text-xs text-slate-400">{execution.target || '-'} · {new Date(execution.scheduledAt).toLocaleString()}</div>
              {execution.error && <div className="mt-1 truncate text-xs text-rose-300">{execution.error}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{this.getScheduledStatusLabel(execution.status)}</span>
              {isPending && <button type="button" onClick={() => this.cancelScheduledExecution(execution.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200">
                {this.cancelScheduledExecutionLabel}
              </button>}
            </div>
          </div>;
        })}
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
        {logs.map((log, index) => this.renderHistoryRow(log, index, true))}
      </div>
    </section>;
  }

  renderHistoryRow(log: Log, index: number, openHistoryOnClick = false) {
    const isSuccess = log.level === 3;
    const isWarning = log.level === 2;
    const icon: UiIcon = isSuccess ? 'check' : isWarning ? 'alert' : 'message';
    const color = isSuccess ? 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/25' : isWarning ? 'text-amber-300 bg-amber-400/10 ring-amber-400/25' : 'text-rose-300 bg-rose-400/10 ring-rose-400/25';
    const badge = isSuccess ? this.readyToSendLabel : isWarning ? this.duplicatedContactsPopup.replace(':', '') : this.messagesNotSentPopup.replace(':', '');
    const logKey = this.getHistoryLogKey(log, index);
    const isSelected = this.state.selectedHistoryLogKey === logKey;

    return <button
      key={logKey}
      type="button"
      onClick={() => this.setState({ selectedHistoryLogKey: logKey, activeTab: openHistoryOnClick ? 'history' : this.state.activeTab })}
      className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition hover:border-emerald-400/35 hover:bg-slate-800/60 ${isSelected ? 'border-emerald-400/40 bg-emerald-400/[0.06]' : 'border-white/10 bg-slate-800/42'}`}
    >
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
    </button>;
  }

  renderModuleHub() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderProductModules()}
      {this.renderSummary()}
      {this.renderLatestExecutions()}
    </div>;
  }

  renderWaExecutionsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderNewExecution()}
      {this.renderScheduledExecutions()}
      {this.renderSummary()}
      {this.renderLatestExecutions()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderMessageTemplatesModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderMessageTemplatesPanel()}
      {this.renderBulkMessagePreview()}
    </div>;
  }

  renderBroadcastsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderModuleActions(['sendMessage', 'sendText', 'sendImage', 'sendAudio', 'sendVideo', 'sendDocument', 'sendPoll', 'sendLocation', 'sendVCard'])}
      {this.renderNewExecution()}
      {this.renderScheduledExecutions()}
      {this.renderLatestExecutions()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderAutomationsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderModuleActions(['allWaJsFunctions', 'diagnostics', 'listChats', 'activeChat'])}
      {this.renderNewExecution()}
      {this.renderScheduledExecutions()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderUtilitiesModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderModuleActions(['openNewChat', 'openChat', 'queryContact', 'listChats', 'listUnreadChats', 'activeChat', 'diagnostics'])}
      {this.renderNewExecution()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderImprovementsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderModuleActions(['markRead', 'markUnread', 'pinChat', 'unpinChat', 'muteChat', 'unmuteChat', 'archiveChat', 'unarchiveChat', 'typing', 'recording', 'pauseTyping', 'setInput'])}
      {this.renderNewExecution()}
      {this.renderScheduledExecutions()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderBusinessToolsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderModuleActions(['profile', 'businessProfile', 'profilePicture', 'contactStatus', 'commonGroups', 'sendVCard', 'sendImage', 'sendVideo', 'sendDocument'])}
      {this.renderNewExecution()}
      {this.state.labResult && this.renderLabResult()}
    </div>;
  }

  renderWebhookApiModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderWebhookApiPanel()}
    </div>;
  }

  renderExportModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderExportCenter()}
    </div>;
  }

  renderStatisticsModule() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderStatisticsDashboard()}
      {this.renderSummary()}
      {this.renderScheduledExecutions()}
    </div>;
  }

  renderHistory() {
    const historyLogs = this.state.logs.slice().reverse();
    const selectedHistoryLog = historyLogs.find((log, index) => this.getHistoryLogKey(log, index) === this.state.selectedHistoryLogKey);

    return <div className="space-y-5 px-7 pb-6">
      {this.state.labResult && this.renderLabResult()}
      {this.renderPanel(<>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">{this.latestExecutionsTitle}</h2>
          <Button variant="ghost" type="button" onClick={this.updateLogs} icon={<Icon name="refresh" className="h-4 w-4" />}>
            {chrome.i18n.getMessage('updateButtonLabel') || 'Update'}
          </Button>
        </div>
        {this.state.selectedHistoryLogKey && <div className="mt-4">
          {this.renderHistoryExecutionDetails(selectedHistoryLog)}
        </div>}
        <div className="mt-4 max-h-[27rem] space-y-2 overflow-auto pr-1">
          {this.state.logs.length === 0 && <div className="rounded-xl border border-dashed border-white/12 bg-slate-950/30 p-6 text-center text-sm text-slate-400">{this.noRecentExecutionsLabel}</div>}
          {historyLogs.map((log, index) => this.renderHistoryRow(log, index))}
        </div>
      </>)}
    </div>;
  }

  renderExtensionUpdatePanel() {
    const currentVersion = this.state.updateInfo?.currentVersion || this.getCurrentExtensionVersion();
    const latestVersion = this.state.updateInfo?.latestVersion || '-';
    const updateAvailable = Boolean(this.state.updateInfo?.updateAvailable);
    const statusLabel = this.state.updateError
      ? this.updateCheckFailedLabel
      : this.state.updateInfo
        ? updateAvailable ? this.updateAvailableLabel : this.extensionUpToDateLabel
        : this.manualUpdateSubtitle;
    const statusClass = this.state.updateError
      ? 'border-rose-400/25 bg-rose-400/10 text-rose-200'
      : updateAvailable
        ? 'border-amber-400/25 bg-amber-400/10 text-amber-100'
        : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';

    return this.renderPanel(<>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white">{this.manualUpdateTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">{this.updateManualInstallHint}</p>
        </div>
        <Button
          type="button"
          variant="glass"
          className="shrink-0"
          disabled={this.state.updateChecking}
          onClick={this.checkForExtensionUpdate}
          icon={<Icon name="refresh" className={`h-4 w-4 ${this.state.updateChecking ? 'animate-spin' : ''}`} />}
        >
          {this.state.updateChecking ? this.checkingUpdateLabel : this.checkUpdateLabel}
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {this.renderMiniMetric(this.currentVersionLabel, currentVersion)}
        {this.renderMiniMetric(this.latestVersionLabel, latestVersion)}
      </div>
      <div className={`mt-4 rounded-xl border p-3 text-sm leading-5 ${statusClass}`}>
        <div className="font-bold">{statusLabel}</div>
        {this.state.updateError && <div className="mt-1 break-words font-mono text-xs opacity-80">{this.state.updateError}</div>}
        {this.state.updateInfo?.publishedAt && <div className="mt-1 text-xs opacity-75">{new Date(this.state.updateInfo.publishedAt).toLocaleString()}</div>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="glass" type="button" onClick={() => this.openExternalUrl(this.state.updateInfo?.releaseUrl || EXTENSION_RELEASES_URL)}>
          {this.openReleaseLabel}
        </Button>
        <Button variant={updateAvailable ? 'primary' : 'glass'} type="button" disabled={!this.state.updateInfo?.assetUrl} onClick={() => this.openExternalUrl(this.state.updateInfo?.assetUrl)}>
          {this.downloadZipLabel}
        </Button>
      </div>
    </>);
  }

  renderSettings() {
    return <div className="space-y-5 px-7 pb-6">
      {this.renderPanel(<div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white">{this.optionsPageTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">{this.optionsPageSubtitle}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="shrink-0"
          onClick={() => this.openModule('modules')}
          icon={<Icon name="list" className="h-4 w-4" />}
        >
          {this.settingsBackLabel}
        </Button>
      </div>)}
      {this.renderExtensionUpdatePanel()}
      <MessageForm />
      <MessageButtonsForm />
      <ArchiveForm />
      <LanguageForm />
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
        {this.renderMiniMetric(status?.isProcessing ? this.messagesLeftPopup : this.messagesNotSentPopup, status?.isProcessing ? status?.remainingItems || 0 : status?.failedItems || 0)}
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

    const contentByTab: Record<PopupTab, ReactNode> = {
      modules: this.renderModuleHub(),
      waExecutions: this.renderWaExecutionsModule(),
      messageTemplates: this.renderMessageTemplatesModule(),
      broadcasts: this.renderBroadcastsModule(),
      automations: this.renderAutomationsModule(),
      utilities: this.renderUtilitiesModule(),
      webhooksApi: this.renderWebhookApiModule(),
      improvements: this.renderImprovementsModule(),
      businessTools: this.renderBusinessToolsModule(),
      export: this.renderExportModule(),
      statistics: this.renderStatisticsModule(),
      history: this.renderHistory(),
      settings: this.renderSettings()
    };

    return this.renderShell(contentByTab[this.state.activeTab] || this.renderModuleHub());
  }
}

void initI18n().then(() => {
  createRoot(document.getElementById('root')!)
    .render(<Popup />);
});
