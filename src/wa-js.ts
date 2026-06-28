import type { Message } from './types/Message';
import type ArchiveStatus from './types/ArchiveStatus';
import type { WaJsLabPayload, WaJsLabResponse } from './types/WaJsLab';
import asyncQueue from './utils/AsyncEventQueue';
import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import storageManager, { AsyncStorageManager } from './utils/AsyncStorageManager';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';
import WPP from '@wppconnect/wa-js';

type WPPWithWebpack = typeof WPP & {
    loader?: {
        onReady(callback: () => void): void;
        onInjected(callback: () => void): void;
        injectLoader(): void;
        injectFallbackModule?(moduleId: number | string, content: any): void;
    };
    webpack?: WPPWithWebpack['loader'];
};

const WPPRuntime = WPP as WPPWithWebpack;

declare global {
    interface Window {
        WPP: WPPWithWebpack;
    }
}

const WebpageMessageManager = new AsyncChromeMessageManager('webpage');

const emptyArchiveStatus = (): ArchiveStatus => ({
    isProcessing: false,
    phase: 'idle',
    totalItems: 0,
    processedItems: 0,
    remainingItems: 0,
    failedItems: 0,
    elapsedTime: 0,
    waiting: false,
    aborted: false
});

let archiveStatus: ArchiveStatus = emptyArchiveStatus();
let archiveStartTime = 0;
let archiveEndTime = 0;
let abortArchive = false;
let runtimeGuardsInstalled = false;

const wait = async (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

const getModelValue = (model: any, key: string) => {
    try {
        return model?.[key] ?? model?.attributes?.[key] ?? model?.[`__x_${key}`] ?? model?.get?.(key);
    } catch (error) {
        return undefined;
    }
};

const getChatId = (chat: any) => {
    const id = getModelValue(chat, 'id');
    return id?._serialized || id?.toString?.() || id;
};

const getArchiveTarget = (chat: any) => getModelValue(chat, 'id') || getChatId(chat);
const isArchivedChat = (chat: any) => Boolean(getModelValue(chat, 'archive'));
const canArchiveChat = (chat: any) => {
    try {
        return typeof chat?.canArchive === 'function' ? chat.canArchive() !== false : true;
    } catch (error) {
        return true;
    }
};

const getStoreChats = () => {
    const chatStore = (window.WPP as any)?.whatsapp?.ChatStore;
    if (!chatStore) return [];

    if (typeof chatStore.getModelsArray === 'function') return chatStore.getModelsArray();
    if (typeof chatStore.toArray === 'function') return chatStore.toArray();
    if (Array.isArray(chatStore.models)) return chatStore.models;
    if (Array.isArray(chatStore._models)) return chatStore._models;
    return [];
};

const hasInitialLoadingScreen = () => {
    const bodyText = document.body?.innerText || '';
    return /carregando\s+(suas\s+)?conversas|loading\s+(your\s+)?chats|loading\s+messages/i.test(bodyText);
};

const hasChatListElement = () => Boolean(document.querySelector([
    '#pane-side',
    '[data-testid="chat-list"]',
    '[data-testid="chat-list-search"]',
    '[data-testid="cell-frame-container"]',
    '[aria-label="Chat list"]',
    '[aria-label="Chats"]',
    '[aria-label="Conversas"]',
    '[aria-label="Lista de conversas"]',
    '[aria-label="Lista de chats"]',
    '[role="grid"]',
    '[role="list"] [role="listitem"]'
].join(',')));

const hasUsableChatStore = () => getStoreChats().length > 0;
const hasRequiredRuntimeApi = () => Boolean(
    (window.WPP as any)?.chat
    && (
        (window.WPP as any).chat.sendRawMessage
        || (window.WPP as any).chat.sendTextMessage
        || (window.WPP as any).chat.list
    )
);

const isWhatsappMainReady = () => {
    const labWpp = window.WPP as any;
    const conn = labWpp?.conn;
    let mainReady: boolean | undefined;

    if (typeof conn?.isMainReady === 'function') {
        try {
            mainReady = Boolean(conn.isMainReady());
        } catch (error) {
            mainReady = undefined;
        }
    }

    if (mainReady === true) return true;
    return Boolean(window.WPP?.isReady) || hasRequiredRuntimeApi() || hasChatListElement() || hasUsableChatStore();
};

async function waitForWhatsappMainReady(timeoutMs = 20000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (isWhatsappMainReady()) return true;
        await wait(250);
    }
    return isWhatsappMainReady();
}

const uniqueChats = (chats: any[]) => {
    const seen = new Set<string>();
    return chats.filter(chat => {
        const chatId = getChatId(chat);
        if (!chatId || seen.has(chatId)) return false;
        seen.add(chatId);
        return true;
    });
};

const listArchiveCandidates = async () => {
    let listError: unknown;
    let chats: any[] = [];

    try {
        const listedChats = await window.WPP.chat.list({ ignoreGroupMetadata: true });
        chats = Array.isArray(listedChats) ? listedChats : [];
    } catch (error) {
        listError = error;
    }

    const storeChats = getStoreChats();
    chats = uniqueChats([...chats, ...storeChats]);

    if (chats.length === 0 && listError) throw listError;
    return chats.filter(chat => !isArchivedChat(chat) && canArchiveChat(chat));
};

const waitForArchiveCandidates = async (timeoutMs = 20000) => {
    const startedAt = Date.now();
    let lastCandidates: any[] = [];

    while (Date.now() - startedAt < timeoutMs) {
        const candidates = await listArchiveCandidates();
        lastCandidates = candidates;

        if (candidates.length > 0 || hasChatListElement() || hasUsableChatStore()) {
            return candidates;
        }

        await wait(500);
    }

    return lastCandidates;
};

const normalizeArchiveDelay = (delayMs: number) => Math.min(10000, Math.max(0, Number.isFinite(delayMs) ? delayMs : 500));

const normalizeLimit = (limit?: number, fallback = 10) => Math.min(50, Math.max(1, Number.isFinite(limit || NaN) ? Number(limit) : fallback));
const normalizeWid = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) return raw;
    const digits = raw.replace(/\D/g, '');
    return digits ? `${digits}@c.us` : raw;
};

const stringifyWid = (value: any) => value?._serialized || value?.toString?.() || value || null;
const stripWidSuffix = (value: any) => String(stringifyWid(value) || '').replace(/@(c|g)\.us$/, '').replace(/@lid$/, '');
const isGroupWid = (value: string) => /@g\.us$/i.test(value);
const isLidWid = (value: string) => /@lid$/i.test(value);
const isPnWid = (value: string) => /@c\.us$/i.test(value);
const getChatTitle = (chat: any) => getModelValue(chat, 'formattedTitle') || getModelValue(chat, 'name') || getModelValue(chat, 'pushname') || getChatId(chat);

const getQueryNumberCandidates = (value: string) => {
    const base = stripWidSuffix(value).replace(/\D/g, '');
    if (!base) return [];
    const candidates = [base];
    if (base.startsWith('55') && base.length === 12) {
        candidates.push(`${base.substring(0, 4)}9${base.substring(4)}`);
    } else if (base.startsWith('55') && base.length === 13) {
        candidates.push(`${base.substring(0, 4)}${base.substring(5)}`);
    }
    return [...new Set(candidates)];
};

const extractWidCandidates = (value: any): string[] => {
    if (!value) return [];
    const normalizeCandidate = (candidate: any) => {
        const raw = String(stringifyWid(candidate) || '').trim();
        if (!raw || raw === '[object Object]') return '';
        if (/@s\.whatsapp\.net$/i.test(raw)) return raw.replace(/@s\.whatsapp\.net$/i, '@c.us');
        if (raw.includes('@')) return raw;
        const digits = raw.replace(/\D/g, '');
        return digits ? `${digits}@c.us` : '';
    };
    const direct = normalizeCandidate(value);
    const candidates = [
        direct,
        normalizeCandidate(value?.pn),
        normalizeCandidate(value?.phoneNumber),
        normalizeCandidate(value?.pnWid),
        normalizeCandidate(value?.wid),
        normalizeCandidate(value?.id),
        normalizeCandidate(value?.contact?.id),
        normalizeCandidate(value?.contact?.wid),
        normalizeCandidate(getModelValue(value?.contact, 'id')),
        normalizeCandidate(getModelValue(value, 'id')),
        normalizeCandidate(value?.lid),
        normalizeCandidate(value?.lidWid),
        normalizeCandidate(value?.userLid)
    ].filter(Boolean).map(String);

    return [...new Set(candidates)];
};

const pickSendWidCandidate = (candidates: string[]) => {
    return candidates.find(isPnWid)
        || candidates.find(candidate => !isLidWid(candidate) && !isGroupWid(candidate))
        || candidates.find(isLidWid)
        || '';
};

const pickRawSendWidCandidate = (candidates: string[]) => {
    return candidates.find(isLidWid)
        || candidates.find(isPnWid)
        || candidates.find(candidate => !isGroupWid(candidate))
        || '';
};

async function getPnLidEntryCandidates(value: string) {
    const getPnLidEntry = (window.WPP as any)?.contact?.getPnLidEntry;
    if (typeof getPnLidEntry !== 'function') return [];

    const input = normalizeWid(value);
    const attempts = [...new Set([input, stripWidSuffix(input)])].filter(Boolean);
    for (const attempt of attempts) {
        try {
            const entry = await getPnLidEntry.call((window.WPP as any).contact, attempt);
            const candidates = extractWidCandidates(entry);
            if (candidates.length > 0) return candidates;
        } catch (error) {
            // Some WhatsApp builds only resolve cached contacts through queryExists.
        }
    }

    return [];
}

async function queryExistsCandidates(value: string) {
    const queryExists = (window.WPP as any)?.contact?.queryExists;
    if (typeof queryExists !== 'function') return [];

    for (const candidate of getQueryNumberCandidates(value)) {
        try {
            const result = await queryExists.call((window.WPP as any).contact, candidate);
            const candidates = extractWidCandidates(result).concat(extractWidCandidates(result?.wid));
            if (candidates.length > 0) return candidates;
        } catch (error) {
            // Keep trying fallback candidates.
        }
    }

    return [];
}

async function resolvePreferredSendWid(value?: string) {
    const normalized = normalizeWid(value);
    if (!normalized) return '';
    if (isGroupWid(normalized)) return normalized;

    const queryCandidates = await queryExistsCandidates(normalized);
    if (queryCandidates.length === 0) return normalized;

    const pnLidCandidates = await getPnLidEntryCandidates(normalized);
    return pickSendWidCandidate([...pnLidCandidates, ...queryCandidates]) || normalized;
}

async function resolveRawSendWid(value?: string) {
    const normalized = normalizeWid(value);
    if (!normalized) return '';
    if (isGroupWid(normalized)) return normalized;

    const queryCandidates = await queryExistsCandidates(normalized);
    const pnLidCandidates = await getPnLidEntryCandidates(normalized);
    const resolved = pickRawSendWidCandidate([...pnLidCandidates, ...queryCandidates]);
    return resolved || normalized;
}

const summarizeChat = (chat: any) => ({
    id: getChatId(chat),
    title: getChatTitle(chat),
    isGroup: Boolean(getModelValue(chat, 'isGroup')),
    archive: Boolean(getModelValue(chat, 'archive')),
    pin: Boolean(getModelValue(chat, 'pin')),
    unreadCount: getModelValue(chat, 'unreadCount') || 0,
    muteExpiration: getModelValue(chat, 'muteExpiration') || null,
    lastReceivedKey: stringifyWid(getModelValue(chat, 'lastReceivedKey')),
    t: getModelValue(chat, 't') || null
});

const summarizeContact = (contact: any) => ({
    id: stringifyWid(getModelValue(contact, 'id') || contact?.wid || contact),
    name: getModelValue(contact, 'name') || getModelValue(contact, 'pushname') || getModelValue(contact, 'shortName') || null,
    isBusiness: Boolean(getModelValue(contact, 'isBusiness')),
    isMyContact: Boolean(getModelValue(contact, 'isMyContact')),
    isUser: Boolean(getModelValue(contact, 'isUser')),
    isWAContact: Boolean(getModelValue(contact, 'isWAContact'))
});

const summarizeMessage = (message: any) => ({
    id: stringifyWid(getModelValue(message, 'id') || message?.id),
    type: getModelValue(message, 'type') || null,
    from: stringifyWid(getModelValue(message, 'from')),
    to: stringifyWid(getModelValue(message, 'to')),
    body: getModelValue(message, 'body') || getModelValue(message, 'caption') || '',
    t: getModelValue(message, 't') || null,
    ack: getModelValue(message, 'ack') ?? null,
    isNewMsg: Boolean(getModelValue(message, 'isNewMsg')),
    isSentByMe: Boolean(getModelValue(message, 'isSentByMe'))
});

const compactValue = (value: any, depth = 0, seen = new WeakSet<object>()): any => {
    if (value == null || typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    if (depth >= 3) return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, 20).map(item => compactValue(item, depth + 1, seen));
    }

    if (getModelValue(value, 'id')) {
        return {
            id: stringifyWid(getModelValue(value, 'id')),
            name: getModelValue(value, 'name') || getModelValue(value, 'formattedTitle') || getModelValue(value, 'pushname') || null
        };
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, entryValue]) => typeof entryValue !== 'function')
            .slice(0, 30)
            .map(([key, entryValue]) => [key, compactValue(entryValue, depth + 1, seen)])
    );
};

const listRuntimeFunctions = (root = window.WPP as any, prefix = 'WPP', depth = 0, seen = new WeakSet<object>()): string[] => {
    if (!root || typeof root !== 'object' || seen.has(root) || depth > 4) return [];
    seen.add(root);

    return Object.keys(root)
        .filter(key => !key.startsWith('_') && key !== 'default')
        .flatMap(key => {
            let value: any;
            try {
                value = root[key];
            } catch (error) {
                return [];
            }

            const path = `${prefix}.${key}`;
            if (typeof value === 'function') return [path];
            if (value && typeof value === 'object') return listRuntimeFunctions(value, path, depth + 1, seen);
            return [];
        })
        .sort();
};

const resolveRuntimeFunction = (path: string) => {
    const parts = path.replace(/^WPP\./, '').split('.').filter(Boolean);
    let context: any = window.WPP;
    for (const part of parts.slice(0, -1)) {
        context = context?.[part];
    }
    const name = parts[parts.length - 1];
    const fn = context?.[name];
    if (typeof fn !== 'function') throw new Error(`Função não encontrada: ${path}`);
    return { context, fn };
};

const parseFunctionArgs = (argsJson?: string): unknown[] => {
    if (!argsJson?.trim()) return [];
    const parsed = JSON.parse(argsJson);
    return Array.isArray(parsed) ? parsed : [parsed];
};

const captureBulkTargets = async (limit: number) => {
    const targets = new Map<string, { id: string; title: string | null; source: string }>();
    const addTarget = (id: any, title: string | null, source: string) => {
        const serialized = stripWidSuffix(id);
        if (!serialized || /\D/.test(serialized)) return;
        targets.set(serialized, { id: serialized, title, source });
    };

    try {
        const chats = await window.WPP.chat.list({ ignoreGroupMetadata: true });
        chats.forEach(chat => {
            const chatId = getChatId(chat);
            if (String(chatId || '').includes('@c.us')) addTarget(chatId, getChatTitle(chat), 'chat');
        });
    } catch (error) {
        // Keep contact fallback below.
    }

    try {
        const contacts = await (window.WPP as any).contact?.list?.({ onlyMyContacts: true });
        if (Array.isArray(contacts)) {
            contacts.forEach(contact => {
                const id = stringifyWid(getModelValue(contact, 'id') || contact?.wid || contact);
                if (String(id || '').includes('@c.us')) addTarget(id, getModelValue(contact, 'name') || getModelValue(contact, 'pushname') || null, 'contact');
            });
        }
    } catch (error) {
        // Some WhatsApp Web versions do not expose contact.list reliably.
    }

    const items = Array.from(targets.values()).slice(0, limit);
    return {
        count: targets.size,
        returned: items.length,
        items,
        contactsText: items.map(item => item.id).join('\n')
    };
};

const makeLabResponse = (payload: WaJsLabPayload, startedAt: number, data?: unknown, error?: unknown): WaJsLabResponse => ({
    ok: !error,
    action: payload.action,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    data,
    error: error instanceof Error ? error.message : error ? String(error) : undefined
});

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(blob);
});

async function attachmentToRawBody(attachment: NonNullable<WaJsLabPayload['attachment']>) {
    const response = await fetch(attachment.url.toString());
    const blob = await response.blob();
    return {
        body: await blobToDataUrl(blob),
        mimetype: blob.type || attachment.type || 'application/octet-stream',
        filename: attachment.name,
        size: blob.size || 0
    };
}

function prepareButtonsForRawMessage(rawMessage: any, buttons: Message['buttons'] = []) {
    if (buttons.length === 0) return rawMessage;
    const prepareMessageButtons = (window.WPP as any)?.chat?.prepareMessageButtons;
    if (typeof prepareMessageButtons !== 'function') return { ...rawMessage, buttons };
    return prepareMessageButtons(rawMessage, { buttons });
}

async function sendRawPreparedMessage(targetChatId: string, rawMessage: any) {
    const rawOptions = { createChat: true, waitForAck: false };

    try {
        return await Promise.race([
            window.WPP.chat.sendRawMessage(targetChatId, rawMessage, rawOptions),
            wait(30000).then(() => {
                throw new Error('Timeout ao aguardar o retorno do sendRawMessage.');
            })
        ]);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Falha no sendRawMessage para ${targetChatId}: ${message}`);
    }
}

async function sendRawTextMessage(chatId: string, text: string, buttons: Message['buttons'] = []) {
    const targetChatId = await resolveRawSendWid(chatId);
    const rawMessage = prepareButtonsForRawMessage({
        body: text,
        type: 'chat',
        subtype: null,
        urlText: null,
        urlNumber: null
    }, buttons);

    return sendRawPreparedMessage(targetChatId, rawMessage);
}

async function sendRawFileMessage(chatId: string, attachment: NonNullable<WaJsLabPayload['attachment']>, caption = '', type: 'image' | 'audio' | 'video' | 'document' = 'document', buttons: Message['buttons'] = []) {
    const targetChatId = await resolveRawSendWid(chatId);
    const file = await attachmentToRawBody(attachment);
    const rawMessage = prepareButtonsForRawMessage({
        type,
        body: file.body,
        mimetype: file.mimetype,
        caption: caption || undefined,
        filename: file.filename,
        isCaptionByUser: Boolean(caption),
        filehash: null,
        encFilehash: null,
        size: file.size,
        mediaKey: null
    }, buttons);

    return sendRawPreparedMessage(targetChatId, rawMessage);
}

async function sendLabFileMessage(chatId: string, payload: WaJsLabPayload, type: 'image' | 'audio' | 'video' | 'document') {
    if (!payload.attachment) throw new Error('Selecione um arquivo para enviar.');
    return sendRawFileMessage(chatId, payload.attachment, payload.text || '', type);
}

async function waitForSendResult(result: any, timeoutMs = 30000) {
    if (!result?.sendMsgResult?.then) return result;

    return Promise.race([
        result.sendMsgResult,
        wait(timeoutMs).then(() => ({ messageSendResult: window.WPP.whatsapp.enums.SendMsgResult.OK, timeout: true }))
    ]);
}

function isSuccessfulSend(value: any, result: any) {
    const okResult = window.WPP?.whatsapp?.enums?.SendMsgResult?.OK;
    const sendResult = value?.messageSendResult ?? value;
    if (sendResult === okResult || sendResult === 'OK') return true;
    return Boolean(result?.id && (result.sendMsgResult == null || result.ack != null));
}

const isIgnorableAiThreadError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack || '' : '';
    return message.includes("reading 'isBot'") && (stack.includes('getMsgAiThread') || stack.includes('maybeLogFirstPromptSentInAiThread'));
};

const installRuntimeGuards = () => {
    if (runtimeGuardsInstalled) return;
    runtimeGuardsInstalled = true;

    window.addEventListener('error', (event) => {
        if (isIgnorableAiThreadError(event.error || event.message)) {
            event.preventDefault();
        }
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
        if (isIgnorableAiThreadError(event.reason)) {
            event.preventDefault();
        }
    }, true);
};

const safeIsAuthenticated = () => {
    if (Boolean(window.WPP?.isReady) || hasRequiredRuntimeApi() || hasChatListElement() || hasUsableChatStore()) {
        return true;
    }

    const connIsAuthenticated = window.WPP?.conn?.isAuthenticated;
    if (typeof connIsAuthenticated === 'function') {
        try {
            return Boolean(connIsAuthenticated.call(window.WPP.conn));
        } catch (error) {
            return false;
        }
    }

    return false;
};

const ensureWaJsReady = async () => {
    if (!await waitForWhatsappMainReady(10000)) {
        throw new Error('WA-JS ainda não está disponível nesta aba. Recarregue o WhatsApp Web e tente novamente.');
    }
};

const getWppLoader = () => window.WPP?.loader ?? window.WPP?.webpack ?? WPPRuntime.loader ?? WPPRuntime.webpack;

async function executeWaJsLab(payload: WaJsLabPayload): Promise<WaJsLabResponse> {
    const startedAt = Date.now();

    try {
        if (payload.action !== 'diagnostics') await ensureWaJsReady();
        const labWpp = window.WPP as any;
        const chatId = normalizeWid(payload.chatId || payload.contactId);
        const contactId = normalizeWid(payload.contactId || payload.chatId);
        const limit = normalizeLimit(payload.limit);

        switch (payload.action) {
            case 'diagnostics': {
                return makeLabResponse(payload, startedAt, {
                    isReady: Boolean(window.WPP.isReady),
                    isAuthenticated: safeIsAuthenticated(),
                    hasInitialLoadingScreen: hasInitialLoadingScreen(),
                    hasChatListElement: hasChatListElement(),
                    hasUsableChatStore: hasUsableChatStore(),
                    hasRequiredRuntimeApi: hasRequiredRuntimeApi(),
                    isOnline: labWpp.conn?.isOnline?.(),
                    isIdle: labWpp.conn?.isIdle?.(),
                    isMainReady: labWpp.conn?.isMainReady?.(),
                    needsUpdate: labWpp.conn?.needsUpdate?.(),
                    platform: compactValue(labWpp.conn?.getPlatform?.()),
                    theme: labWpp.conn?.getTheme?.(),
                    myUserId: stringifyWid(labWpp.conn?.getMyUserId?.()),
                    myUserWid: stringifyWid(labWpp.conn?.getMyUserWid?.()),
                    myUserLid: stringifyWid(labWpp.conn?.getMyUserLid?.()),
                    build: compactValue(labWpp.conn?.getBuildConstants?.())
                });
            }
            case 'profile':
                return makeLabResponse(payload, startedAt, {
                    name: labWpp.profile?.getMyProfileName?.(),
                    status: await labWpp.profile?.getMyStatus?.(),
                    isBusiness: labWpp.profile?.isBusiness?.()
                });
            case 'listChats': {
                const chats = await window.WPP.chat.list({ ignoreGroupMetadata: true });
                return makeLabResponse(payload, startedAt, {
                    count: chats.length,
                    items: chats.slice(0, limit).map(summarizeChat)
                });
            }
            case 'captureBulkTargets':
                return makeLabResponse(payload, startedAt, await captureBulkTargets(Math.min(10000, Math.max(1, Number(payload.limit) || 10000))));
            case 'listFunctions': {
                const functions = listRuntimeFunctions();
                return makeLabResponse(payload, startedAt, {
                    count: functions.length,
                    items: functions
                });
            }
            case 'executeFunction': {
                if (!payload.functionPath) throw new Error('Informe o caminho da função, por exemplo WPP.chat.list.');
                const { context, fn } = resolveRuntimeFunction(payload.functionPath);
                const args = parseFunctionArgs(payload.argsJson);
                return makeLabResponse(payload, startedAt, compactValue(await fn.apply(context, args)));
            }
            case 'listUnreadChats': {
                const chats = await window.WPP.chat.getUnreadChats(false);
                return makeLabResponse(payload, startedAt, {
                    count: chats.length,
                    items: chats.slice(0, limit).map(summarizeChat)
                });
            }
            case 'activeChat':
                return makeLabResponse(payload, startedAt, summarizeChat(window.WPP.chat.getActiveChat()));
            case 'chatMessages':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, {
                    chatId,
                    items: (await window.WPP.chat.getMessages(chatId, { count: limit })).map(summarizeMessage)
                });
            case 'queryContact':
                if (!contactId) throw new Error('Informe um contato ou número.');
                let pnLidEntry = null;
                try {
                    pnLidEntry = await labWpp.contact?.getPnLidEntry?.(contactId);
                } catch (error) {
                    pnLidEntry = null;
                }
                return makeLabResponse(payload, startedAt, {
                    query: contactId,
                    pnLidEntry: compactValue(pnLidEntry),
                    exists: compactValue(await labWpp.contact?.queryExists?.(contactId.replace('@c.us', ''))),
                    widExists: compactValue(await window.WPP.contact.queryWidExists(contactId))
                });
            case 'contactStatus':
                if (!contactId) throw new Error('Informe um contato ou número.');
                return makeLabResponse(payload, startedAt, { contactId, status: await window.WPP.contact.getStatus(contactId) });
            case 'profilePicture':
                if (!contactId) throw new Error('Informe um contato ou número.');
                return makeLabResponse(payload, startedAt, { contactId, url: await window.WPP.contact.getProfilePictureUrl(contactId, true) });
            case 'businessProfile':
                if (!contactId) throw new Error('Informe um contato ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.contact.getBusinessProfile(contactId)));
            case 'commonGroups':
                if (!contactId) throw new Error('Informe um contato ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.contact.getCommonGroups(contactId)));
            case 'openChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, { chatId, opened: await window.WPP.chat.openChatBottom(chatId) });
            case 'openNewChat': {
                if (!chatId) throw new Error('Informe um chatId ou número.');
                const targetChatId = await resolveRawSendWid(chatId);
                const opened = await window.WPP.chat.openChatBottom(targetChatId);
                const text = (payload.text || '').trim();
                const sent = text ? await sendRawTextMessage(targetChatId, text) : null;
                return makeLabResponse(payload, startedAt, compactValue({
                    chatId: targetChatId,
                    opened,
                    sent
                }));
            }
            case 'markRead':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.markIsRead(chatId)));
            case 'markUnread':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.markIsUnread(chatId)));
            case 'pinChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.pin(chatId)));
            case 'unpinChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.unpin(chatId)));
            case 'muteChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.mute(chatId, { duration: 3600 })));
            case 'unmuteChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                await window.WPP.chat.unmute(chatId);
                return makeLabResponse(payload, startedAt, { chatId, muted: false });
            case 'archiveChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.archive(chatId)));
            case 'unarchiveChat':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.unarchive(chatId)));
            case 'typing':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                await window.WPP.chat.markIsComposing(chatId, 5000);
                return makeLabResponse(payload, startedAt, { chatId, state: 'typing', duration: 5000 });
            case 'recording':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                await window.WPP.chat.markIsRecording(chatId, 5000);
                return makeLabResponse(payload, startedAt, { chatId, state: 'recording', duration: 5000 });
            case 'pauseTyping':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                await window.WPP.chat.markIsPaused(chatId);
                return makeLabResponse(payload, startedAt, { chatId, state: 'paused' });
            case 'setInput':
                await window.WPP.chat.setInputText(payload.text || '', chatId || undefined);
                return makeLabResponse(payload, startedAt, { chatId: chatId || null, text: payload.text || '' });
            case 'sendText':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await sendRawTextMessage(chatId, payload.text || 'Teste WA-JS Lab')));
            case 'sendImage':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await sendLabFileMessage(chatId, payload, 'image')));
            case 'sendAudio':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await sendLabFileMessage(chatId, payload, 'audio')));
            case 'sendVideo':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await sendLabFileMessage(chatId, payload, 'video')));
            case 'sendDocument':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await sendLabFileMessage(chatId, payload, 'document')));
            case 'sendPoll':
                if (!chatId) throw new Error('Informe um chatId de grupo.');
                return makeLabResponse(payload, startedAt, compactValue(await labWpp.chat?.sendCreatePollMessage?.(await resolvePreferredSendWid(chatId), payload.text || 'Teste WA-JS Lab', ['Sim', 'Não'], { selectableCount: 1 })));
            case 'sendLocation':
                if (!chatId) throw new Error('Informe um chatId ou número.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.sendLocationMessage(await resolvePreferredSendWid(chatId), {
                    lat: payload.latitude ?? -23.55052,
                    lng: payload.longitude ?? -46.633308,
                    name: 'WA-JS Lab',
                    address: 'Localização de teste'
                })));
            case 'sendVCard':
                if (!chatId || !contactId) throw new Error('Informe chatId e contactId.');
                return makeLabResponse(payload, startedAt, compactValue(await window.WPP.chat.sendVCardContactMessage(await resolvePreferredSendWid(chatId), {
                    id: await resolvePreferredSendWid(contactId),
                    name: payload.text || 'Contato WA-JS Lab'
                })));
            default:
                throw new Error(`Ação não suportada: ${payload.action}`);
        }
    } catch (error) {
        return makeLabResponse(payload, startedAt, undefined, error);
    }
}

async function archiveAllChats({ delayMs }: { delayMs: number }) {
    if (archiveStatus.isProcessing) return false;

    delayMs = normalizeArchiveDelay(delayMs);
    abortArchive = false;
    archiveStartTime = Date.now();
    archiveEndTime = 0;
    archiveStatus = {
        ...emptyArchiveStatus(),
        isProcessing: true,
        phase: 'starting',
        elapsedTime: 0
    };

    try {
        if (!await waitForWhatsappMainReady()) {
            throw new Error('Abra o WhatsApp Web e conecte-se primeiro.');
        }

        archiveStatus = {
            ...archiveStatus,
            phase: 'listing'
        };

        const archivableChats = await waitForArchiveCandidates();
        archiveStatus = {
            ...archiveStatus,
            phase: archivableChats.length > 0 ? 'archiving' : 'finished',
            totalItems: archivableChats.length,
            remainingItems: archivableChats.length
        };

        for (const chat of archivableChats) {
            if (abortArchive) break;
            const chatId = getChatId(chat);
            archiveStatus = {
                ...archiveStatus,
                currentChat: chatId
            };

            try {
                await window.WPP.chat.archive(getArchiveTarget(chat));
                archiveStatus = {
                    ...archiveStatus,
                    processedItems: archiveStatus.processedItems + 1,
                    remainingItems: Math.max(archiveStatus.remainingItems - 1, 0)
                };
            } catch (error) {
                archiveStatus = {
                    ...archiveStatus,
                    failedItems: archiveStatus.failedItems + 1,
                    remainingItems: Math.max(archiveStatus.remainingItems - 1, 0)
                };
                WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, {
                    level: 1,
                    message: error instanceof Error ? error.message : 'Falha ao arquivar chat',
                    attachment: false,
                    contact: chatId
                });
            }

            if (delayMs > 0 && archiveStatus.remainingItems > 0 && !abortArchive) {
                archiveStatus = { ...archiveStatus, waiting: Date.now() };
                const waitStart = Date.now();
                while (Date.now() - waitStart < delayMs) {
                    if (abortArchive) break;
                    await wait(Math.min(100, delayMs));
                }
                archiveStatus = { ...archiveStatus, waiting: false };
            }
        }

        return true;
    } catch (error) {
        archiveStatus = {
            ...archiveStatus,
            phase: 'error',
            error: error instanceof Error ? error.message : 'Falha ao listar ou arquivar chats.',
            isProcessing: false,
            waiting: false,
            currentChat: undefined
        };
        WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, {
            level: 1,
            message: archiveStatus.error || 'Falha ao listar ou arquivar chats.',
            attachment: false,
            contact: 'archive'
        });
        return false;
    } finally {
        archiveEndTime = Date.now();
        archiveStatus = {
            ...archiveStatus,
            isProcessing: false,
            phase: archiveStatus.phase === 'error' ? 'error' : abortArchive ? 'cancelled' : archiveStatus.phase === 'finished' ? 'finished' : 'finished',
            aborted: abortArchive,
            currentChat: undefined,
            waiting: false,
            elapsedTime: archiveEndTime - archiveStartTime
        };
    }
}

function stopArchive() {
    abortArchive = true;
}

function getArchiveStatus(): ArchiveStatus {
    const elapsedTime = archiveStartTime === 0
        ? 0
        : archiveStatus.isProcessing
            ? Date.now() - archiveStartTime
            : Math.max(archiveEndTime - archiveStartTime, 0);

    return {
        ...archiveStatus,
        elapsedTime,
        waiting: archiveStatus.waiting === false ? false : Date.now() - archiveStatus.waiting
    };
}

async function sendWPPMessage({ contact, message, attachment, buttons = [] }: Message) {
    if (attachment && buttons.length > 0) {
        return sendRawFileMessage(contact, attachment, message, 'image', buttons);
    } else if (buttons.length > 0) {
        return sendRawTextMessage(contact, message, buttons);
    } else if (attachment) {
        const type = attachment.type.startsWith('image/')
            ? 'image'
            : attachment.type.startsWith('audio/')
                ? 'audio'
                : attachment.type.startsWith('video/')
                    ? 'video'
                    : 'document';
        return sendRawFileMessage(contact, attachment, message, type);
    } else {
        return sendRawTextMessage(contact, message);
    }
}

async function sendMessage({ contact, hash, scheduledAt }: { contact: string, hash: number, scheduledAt?: number }) {
    if (!await waitForWhatsappMainReady(10000)) {
        const errorMsg = 'WA-JS ainda não está disponível nesta aba. Recarregue o WhatsApp Web e tente novamente.';
        WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: errorMsg, attachment: false, contact });
        throw new Error(errorMsg);
    }
    const { message } = await storageManager.retrieveMessage(hash);

    if (scheduledAt && scheduledAt > Date.now()) {
        await wait(scheduledAt - Date.now());
    }

    const resolvedContact = await resolvePreferredSendWid(contact);
    if (!resolvedContact) {
        console.log('Número não encontrado!');
        return void WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: 'Número não encontrado!', attachment: message.attachment != null, contact });
    }

    contact = resolvedContact;

    const result = await sendWPPMessage({ contact, ...message });
    const value = await waitForSendResult(result);
    if (!isSuccessfulSend(value, result)) {
        throw new Error('Falha ao enviar a mensagem: ' + value);
    } else {
        WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 3, message: 'Mensagem enviada com sucesso!', attachment: message.attachment != null, contact: contact });
    }
    return value;
}

async function addToQueue(message: Message) {
    try {
        const messageHash = AsyncStorageManager.calculateMessageHash(message);
        await storageManager.storeMessage(message, messageHash);
        await asyncQueue.add({ eventHandler: sendMessage, detail: { contact: message.contact, hash: messageHash, delay: message.delay, scheduledAt: message.scheduledAt } });
        return true;
    } catch (error) {
        if (error instanceof Error) {
            WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: error.message, attachment: message.attachment != null, contact: message.contact });
        }
        throw error;
    }
}

WebpageMessageManager.addHandler(ChromeMessageTypes.PAUSE_QUEUE, () => {
    try {
        asyncQueue.pause();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.RESUME_QUEUE, () => {
    try {
        asyncQueue.resume();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.STOP_QUEUE, () => {
    try {
        asyncQueue.stop();
        stopArchive();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.SEND_MESSAGE, async (message) => {
    if (window.WPP.isReady) {
        return addToQueue(message);
    } else {
        return new Promise((resolve, reject) => {
            getWppLoader()!.onReady(async () => {
                try {
                    resolve(await addToQueue(message));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.QUEUE_STATUS, () => asyncQueue.getStatus());
WebpageMessageManager.addHandler(ChromeMessageTypes.ARCHIVE_STATUS, () => getArchiveStatus());

WebpageMessageManager.addHandler(ChromeMessageTypes.ARCHIVE_ALL_CHATS, async (payload) => {
    if (isWhatsappMainReady()) {
        void archiveAllChats(payload);
        return true;
    }

    const loader = getWppLoader();
    if (!loader?.onReady) {
        void archiveAllChats(payload);
        return true;
    }

    return new Promise((resolve, reject) => {
        loader.onReady(async () => {
            try {
                void archiveAllChats(payload);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    });
});

WebpageMessageManager.addHandler(ChromeMessageTypes.WAJS_LAB_EXECUTE, async (payload) => {
    if (isWhatsappMainReady()) {
        return executeWaJsLab(payload);
    }

    const loader = getWppLoader();
    if (!loader?.onReady) {
        return executeWaJsLab(payload);
    }

    return new Promise((resolve) => {
        loader.onReady(async () => {
            resolve(await executeWaJsLab(payload));
        });
    });
});

storageManager.clearDatabase();
installRuntimeGuards();

const registerWaJsRuntimeFallbacks = () => {
    const injectFallbackModule = getWppLoader()?.injectFallbackModule;
    if (typeof injectFallbackModule !== 'function') return;

    const isLoggedIn = () => safeIsAuthenticated();
    const emptyCollection = {
        models: [],
        _models: [],
        on: () => emptyCollection,
        off: () => emptyCollection,
        once: () => emptyCollection,
        add: () => emptyCollection,
        remove: () => emptyCollection,
        trigger: () => emptyCollection,
        get: () => undefined,
        find: () => undefined,
        findFirst: () => undefined,
        getModelsArray: () => [],
        toArray: () => []
    };

    injectFallbackModule('wppconnect-extension-is-authenticated', {
        isLoggedIn,
        Z: isLoggedIn
    });
    injectFallbackModule('wppconnect-extension-chat-store', {
        ChatCollection: emptyCollection
    });
};

registerWaJsRuntimeFallbacks();

getWppLoader()?.onInjected(() => {
    console.log('Wppconnect: Loader injected!');
});

getWppLoader()?.injectLoader();
