import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import type ChromeMessageContentTypes from './types/ChromeMessageContentTypes';
import type Log from './types/Log';
import type { Message } from './types/Message';
import type { ScheduledExecution } from './types/ScheduledExecution';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';

const ContentScriptMessageManager = new AsyncChromeMessageManager('contentScript');
const SCHEDULED_EXECUTIONS_KEY = 'scheduledExecutions';
const SCHEDULE_RESPONSE_TIMEOUT_MS = 60000;
const scheduledTimers: Record<string, number> = {};

type MessageData<K extends keyof ChromeMessageContentTypes> = {
  source: 'Wppconnect';
  type: K;
  payload: ChromeMessageContentTypes[K]['payload'];
};

type MessageDataResponse<K extends keyof ChromeMessageContentTypes> = {
  source: 'Wppconnect';
  type: `${K}_RESPONSE`;
  payload: ChromeMessageContentTypes[K]['response'];
};

function addLog({ level, message, attachment = false, contact }: Log) {
  return chrome.storage.local.get({ logs: [] }, async data => {
    const currentLogs = data.logs;
    currentLogs.push({
      level,
      message,
      attachment,
      contact,
      date: new Date().toLocaleString()
    });
    return chrome.storage.local.set({ logs: currentLogs });
  });
}

function getScheduledExecutions(): Promise<ScheduledExecution[]> {
  return new Promise(resolve => {
    chrome.storage.local.get({ [SCHEDULED_EXECUTIONS_KEY]: [] }, data => {
      resolve((data[SCHEDULED_EXECUTIONS_KEY] || []) as ScheduledExecution[]);
    });
  });
}

function setScheduledExecutions(executions: ScheduledExecution[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SCHEDULED_EXECUTIONS_KEY]: executions }, resolve);
  });
}

async function updateScheduledExecution(id: string, patch: Partial<ScheduledExecution>) {
  const executions = await getScheduledExecutions();
  const updated = executions.map(execution => execution.id === id
    ? { ...execution, ...patch, updatedAt: Date.now() }
    : execution);
  await setScheduledExecutions(updated);
  return updated;
}

function sendWebpageMessage<K extends keyof ChromeMessageContentTypes>(
  type: K,
  payload: ChromeMessageContentTypes[K]['payload']
): Promise<ChromeMessageContentTypes[K]['response']> {
  const message: MessageData<K> = { source: 'Wppconnect', type, payload };

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', responseListener);
      reject(new Error(`Wppconnect message timeout: ${type}`));
    }, SCHEDULE_RESPONSE_TIMEOUT_MS);

    const responseListener = (event: MessageEvent<MessageDataResponse<K>>) => {
      if (
        event.source === window &&
        event.origin === window.location.origin &&
        event.data.source === 'Wppconnect' &&
        event.data.type === `${type}_RESPONSE`
      ) {
        window.clearTimeout(timeoutId);
        window.removeEventListener('message', responseListener);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', responseListener);
    window.postMessage(message, window.location.origin);
  });
}

async function executeScheduledExecution(execution: ScheduledExecution) {
  const latest = await getScheduledExecutions();
  const current = latest.find(item => item.id === execution.id);
  if (!current || current.status !== 'scheduled') return;

  await updateScheduledExecution(execution.id, { status: 'running', error: undefined });
  addLog({ level: 2, message: `Agendamento iniciado: ${execution.label}`, attachment: false, contact: execution.target });

  try {
    const payload = execution.payload;
    let result: unknown;

    if (payload.kind === 'wajs') {
      result = await sendWebpageMessage(ChromeMessageTypes.WAJS_LAB_EXECUTE, payload.labPayload);
      const response = result as ChromeMessageContentTypes[ChromeMessageTypes.WAJS_LAB_EXECUTE]['response'];
      if (!response.ok) throw new Error(response.error || 'Falha ao executar ação agendada.');
    } else if (payload.kind === 'archiveChats') {
      result = await sendWebpageMessage(ChromeMessageTypes.ARCHIVE_ALL_CHATS, { delayMs: payload.delayMs });
    } else {
      const messages: Message[] = payload.contacts.map(contact => ({
        contact,
        message: payload.message,
        attachment: payload.attachment,
        buttons: payload.buttons,
        delay: payload.delay
      }));

      for (const message of messages) {
        result = await sendWebpageMessage(ChromeMessageTypes.SEND_MESSAGE, message);
      }
    }

    await updateScheduledExecution(execution.id, { status: 'completed', result });
    addLog({ level: 3, message: `Agendamento executado: ${execution.label}`, attachment: false, contact: execution.target });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateScheduledExecution(execution.id, { status: 'failed', error: message });
    addLog({ level: 1, message: `Agendamento falhou: ${execution.label} - ${message}`, attachment: false, contact: execution.target });
  }
}

function clearScheduledTimers() {
  Object.values(scheduledTimers).forEach(timer => window.clearTimeout(timer));
  Object.keys(scheduledTimers).forEach(id => delete scheduledTimers[id]);
}

async function refreshScheduledTimers() {
  clearScheduledTimers();
  const executions = await getScheduledExecutions();
  executions
    .filter(execution => execution.status === 'scheduled')
    .forEach(execution => {
      const delay = Math.max(0, execution.scheduledAt - Date.now());
      scheduledTimers[execution.id] = window.setTimeout(() => {
        delete scheduledTimers[execution.id];
        void executeScheduledExecution(execution);
      }, delay);
    });
}

ContentScriptMessageManager.addHandler(ChromeMessageTypes.ADD_LOG, (log) => {
  try {
    addLog(log);
    return true;
  } catch (error) {
    return false;
  }
});

ContentScriptMessageManager.addHandler(ChromeMessageTypes.SCHEDULE_EXECUTION, async (execution) => {
  const executions = await getScheduledExecutions();
  const nextExecution = { ...execution, status: 'scheduled' as const, updatedAt: Date.now() };
  await setScheduledExecutions([...executions.filter(item => item.id !== execution.id), nextExecution]);
  await refreshScheduledTimers();
  addLog({ level: 2, message: `Agendado: ${nextExecution.label}`, attachment: false, contact: nextExecution.target });
  return nextExecution;
});

ContentScriptMessageManager.addHandler(ChromeMessageTypes.LIST_SCHEDULED_EXECUTIONS, () => getScheduledExecutions());

ContentScriptMessageManager.addHandler(ChromeMessageTypes.CANCEL_SCHEDULED_EXECUTION, async ({ id }) => {
  if (scheduledTimers[id]) {
    window.clearTimeout(scheduledTimers[id]);
    delete scheduledTimers[id];
  }

  const executions = await updateScheduledExecution(id, { status: 'cancelled' });
  const cancelled = executions.find(execution => execution.id === id);
  if (cancelled) addLog({ level: 2, message: `Agendamento cancelado: ${cancelled.label}`, attachment: false, contact: cancelled.target });
  return executions;
});

void refreshScheduledTimers();
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[SCHEDULED_EXECUTIONS_KEY]) {
    void refreshScheduledTimers();
  }
});
