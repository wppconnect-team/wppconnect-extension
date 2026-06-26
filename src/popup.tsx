import React, { ChangeEvent, Component, FormEvent, MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Button from './components/atoms/Button';
import { ControlTextArea } from './components/atoms/ControlFactory';
import Box from './components/molecules/Box';
import ArchiveStatus from './types/ArchiveStatus';
import QueueStatus from './types/QueueStatus';
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

type PopupState = {
  contacts: string,
  duplicatedContacts: number,
  status?: QueueStatus,
  archiveStatus?: ArchiveStatus,
  confirmed: boolean,
  archiveConfirmOpen: boolean,
  activeOperation?: 'send' | 'archive'
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
  reviewContactsLabel = chrome.i18n.getMessage('reviewContactsLabel') || 'Review your contacts';
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
  archivedChatsLabel = chrome.i18n.getMessage('archivedChatsLabel') || 'Archived';
  archiveFailedLabel = chrome.i18n.getMessage('archiveFailedLabel') || 'Failed';
  archiveCurrentChatLabel = chrome.i18n.getMessage('archiveCurrentChatLabel') || 'Current chat';

  queueStatusListener = 0;
  archiveStatusListener = 0;

  componentDidMount() {
    const body = document.querySelector('body');
    if (!body) return;
    body.classList.add('bg-slate-100');
    body.classList.add('dark:bg-slate-950');
    body.style.minWidth = '26rem';

    this.updateStatus();
    this.updateArchiveStatus();
    this.queueStatusListener = window.setInterval(this.updateStatus, 250);
    this.archiveStatusListener = window.setInterval(this.updateArchiveStatus, 250);
  }

  updateStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.QUEUE_STATUS, undefined).then((status) => {
      this.setState({ status });
    });
  }

  updateArchiveStatus = () => {
    PopupMessageManager.sendMessage(ChromeMessageTypes.ARCHIVE_STATUS, undefined).then((archiveStatus) => {
      this.setState({ archiveStatus });
    });
  }

  componentWillUnmount() {
    clearInterval(this.queueStatusListener);
    clearInterval(this.archiveStatusListener);
  }

  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<PopupState>, snapshot?: any) {
    if (!prevState.status?.isProcessing && this.state.status?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'send' });
    }
    if (!prevState.archiveStatus?.isProcessing && this.state.archiveStatus?.isProcessing) {
      this.setState({ confirmed: false, activeOperation: 'archive' });
    }
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

  handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const language = chrome.i18n.getUILanguage();
    chrome.storage.local.get({ message: this.defaultMessage, attachment: null, buttons: [], delay: 0, prefix: language === 'pt_BR' ? 55 : 0 }, async data => {
      const contacts = this.parseContacts(data.prefix);
      if (contacts.length === 0) return;

      contacts.forEach(contact => {
        PopupMessageManager.sendMessage(ChromeMessageTypes.SEND_MESSAGE, { contact, message: data.message, attachment: data.attachment, buttons: data.buttons, delay: data.delay });
      });
      this.setState({ confirmed: false, activeOperation: 'send' });
    });
  }

  handleArchiveChats = () => {
    this.setState({ archiveConfirmOpen: true });
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

  handleOptions = (event: MouseEvent<HTMLButtonElement>) => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
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

  renderMetric(label: string, value: string | number) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</div>
    </div>;
  }

  renderProgress() {
    const progress = this.getProgress();

    return <Box
      className="w-[26rem]"
      title={this.state.status?.isProcessing ? this.sendingMessagePopup : this.queueFinishedLabel}
      footer={this.state.status?.isProcessing ?
        <Button className="w-full" variant="danger" type="button" onClick={() => PopupMessageManager.sendMessage(ChromeMessageTypes.STOP_QUEUE, undefined)}>{this.cancelButtonLabel}</Button>
        : <Button className="w-full" variant="primary" type="button" onClick={() => this.setState({ confirmed: true, activeOperation: undefined })}>{this.okButtonLabel}</Button>}>
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{this.state.status?.isProcessing ? this.sendingPopup : this.readyToSendLabel}</span>
            <span className="font-mono text-slate-500">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full progress-bar${this.state.status?.isProcessing ? ' progress-bar-animated' : ''}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {this.renderMetric(this.messageTimePopup, this.formatTime(this.state.status?.elapsedTime || 0))}
          {this.state.status?.waiting ? this.renderMetric(this.waitingPopup, this.formatTime(this.state.status.waiting)) : this.renderMetric(this.duplicatedContactsPopup, this.state.duplicatedContacts)}
          {this.renderMetric(this.messagesSentPopup, this.state.status?.processedItems || 0)}
          {this.renderMetric(this.state.status?.isProcessing ? this.messagesLeftPopup : this.messagesNotSentPopup, this.state.status?.remainingItems || 0)}
        </div>
      </div>
    </Box>;
  }

  renderArchiveProgress() {
    const progress = this.getArchiveProgress();
    const archiveStatus = this.state.archiveStatus;
    const isIndeterminate = Boolean(archiveStatus?.isProcessing && archiveStatus.totalItems === 0);
    const progressWidth = isIndeterminate ? '100%' : `${progress}%`;
    const progressText = isIndeterminate ? '...' : `${progress}%`;

    return <Box
      className="w-[26rem]"
      title={this.getArchiveTitle()}
      footer={archiveStatus?.isProcessing ?
        <Button className="w-full" variant="danger" type="button" onClick={() => PopupMessageManager.sendMessage(ChromeMessageTypes.STOP_QUEUE, undefined)}>{this.cancelButtonLabel}</Button>
        : <Button className="w-full" variant="primary" type="button" onClick={() => this.setState({ confirmed: true, activeOperation: undefined })}>{this.okButtonLabel}</Button>}>
      <div className="space-y-4">
        <div className={`rounded-lg border p-4 ${archiveStatus?.phase === 'error'
          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/70 dark:bg-rose-950/30'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className={`truncate font-semibold ${archiveStatus?.phase === 'error' ? 'text-rose-700 dark:text-rose-200' : 'text-slate-700 dark:text-slate-200'}`}>
              {this.getArchiveProgressLabel()}
            </span>
            <span className="font-mono text-slate-500">{progressText}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full progress-bar${archiveStatus?.isProcessing ? ' progress-bar-animated' : ''}`}
              style={{ width: progressWidth }}
            ></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {this.renderMetric(this.messageTimePopup, this.formatTime(archiveStatus?.elapsedTime || 0))}
          {archiveStatus?.waiting ? this.renderMetric(this.waitingPopup, this.formatTime(archiveStatus.waiting)) : this.renderMetric(this.archiveFailedLabel, archiveStatus?.failedItems || 0)}
          {this.renderMetric(this.archivedChatsLabel, archiveStatus?.processedItems || 0)}
          {this.renderMetric(this.messagesLeftPopup, archiveStatus?.remainingItems || 0)}
        </div>
        {archiveStatus?.currentChat && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span className="font-semibold">{this.archiveCurrentChatLabel}: </span>
          <span className="font-mono">{archiveStatus.currentChat}</span>
        </div>}
      </div>
    </Box>;
  }

  renderArchiveConfirmation() {
    if (!this.state.archiveConfirmOpen) return null;

    return <div
      role="dialog"
      aria-modal="false"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="font-semibold">{this.archiveChatsConfirmLabel}</div>
      <p className="mt-1 text-xs leading-5 text-amber-900 dark:text-amber-100/80">{this.archiveConfirmDescriptionLabel}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => this.setState({ archiveConfirmOpen: false })}
        >
          {this.cancelButtonLabel}
        </Button>
        <Button
          variant="warning"
          type="button"
          onClick={this.confirmArchiveChats}
        >
          {this.archiveConfirmSubmitLabel}
        </Button>
      </div>
    </div>;
  }

  renderForm() {
    const summary = this.getContactSummary();

    return <form onSubmit={this.handleSubmit}>
      <Box className="w-[26rem]" title={this.reviewContactsLabel} footer={this.prefixFooterNotePopup}>
        <label className="flex min-h-[13rem] flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{this.contactsLabel}</span>
          <ControlTextArea
            className="min-h-[12rem] resize-none"
            value={this.state.contacts}
            onChange={this.handleChange}
            placeholder={this.messagePlaceholderPopup}
            required
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {this.renderMetric(this.totalContactsLabel, summary.total)}
          {this.renderMetric(this.uniqueContactsLabel, summary.unique)}
          {this.renderMetric(this.duplicatedContactsPopup, summary.duplicated)}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="primary" type="submit" disabled={summary.unique === 0}>{this.sendButtonLabel}</Button>
          <Button
            variant="secondary"
            type="button"
            onClick={this.handleOptions}
          >
            {this.optionsButtonLabel}
          </Button>
        </div>
        <Button
          className="w-full"
          variant="warning"
          type="button"
          onClick={this.handleArchiveChats}
        >
          {this.archiveChatsButtonLabel}
        </Button>
        {this.renderArchiveConfirmation()}
      </Box>
    </form>;
  }

  render() {
    if (this.state.activeOperation === 'archive') return this.renderArchiveProgress();
    if (this.state.activeOperation === 'send' || !this.state.confirmed) return this.renderProgress();
    return this.state.confirmed ? this.renderForm() : this.renderProgress();
  }
}

createRoot(document.getElementById('root')!)
  .render(<Popup />);
