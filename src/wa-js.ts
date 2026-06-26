import type { Message } from './types/Message';
import type ArchiveStatus from './types/ArchiveStatus';
import asyncQueue from './utils/AsyncEventQueue';
import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import storageManager, { AsyncStorageManager } from './utils/AsyncStorageManager';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';
import WPP from '@wppconnect/wa-js';

type WPPWithWebpack = typeof WPP & {
    webpack?: {
        onReady(callback: () => void): void;
        onInjected(callback: () => void): void;
        injectLoader(): void;
    }
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

const normalizeArchiveDelay = (delayMs: number) => Math.min(10000, Math.max(0, Number.isFinite(delayMs) ? delayMs : 500));

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
        if (!window.WPP?.conn?.isAuthenticated?.()) {
            throw new Error('Abra o WhatsApp Web e conecte-se primeiro.');
        }

        archiveStatus = {
            ...archiveStatus,
            phase: 'listing'
        };

        const archivableChats = await listArchiveCandidates();
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
        const response = await fetch(attachment.url.toString());
        const data = await response.blob();
        return window.WPP.chat.sendFileMessage(
            contact,
            new File([data], attachment.name, {
                type: attachment.type,
                lastModified: attachment.lastModified,
            }),
            {
                type: 'image',
                caption: message,
                createChat: true,
                waitForAck: true,
                buttons
            }
        );
    } else if (buttons.length > 0) {
        return window.WPP.chat.sendTextMessage(contact, message, {
            createChat: true,
            waitForAck: true,
            buttons
        });
    } else if (attachment) {
        const response = await fetch(attachment.url.toString());
        const data = await response.blob();
        return window.WPP.chat.sendFileMessage(
            contact,
            new File([data], attachment.name, {
                type: attachment.type,
                lastModified: attachment.lastModified,
            }),
            {
                type: 'auto-detect',
                caption: message,
                createChat: true,
                waitForAck: true
            }
        );
    } else {
        return window.WPP.chat.sendTextMessage(contact, message, {
            createChat: true,
            waitForAck: true
        });
    }
}

async function sendMessage({ contact, hash }: { contact: string, hash: number }) {
    if (!window.WPP?.conn?.isAuthenticated?.()) {
        const errorMsg = 'Abra o WhatsApp Web e conecte-se primeiro.';
        WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: errorMsg, attachment: false, contact });
        throw new Error(errorMsg);
    }
    const { message } = await storageManager.retrieveMessage(hash);

    let findContact = await window.WPP.contact.queryExists(contact);
    if (!findContact) {
        let truncatedNumber = contact;
        if (truncatedNumber.startsWith('55') && truncatedNumber.length === 12) {
            truncatedNumber = `${truncatedNumber.substring(0, 4)}9${truncatedNumber.substring(4)}`;
        } else if (truncatedNumber.startsWith('55') && truncatedNumber.length === 13) {
            truncatedNumber = `${truncatedNumber.substring(0, 4)}${truncatedNumber.substring(5)}`;
        }
        findContact = await window.WPP.contact.queryExists(truncatedNumber);
        if (!findContact) {
            console.log('Número não encontrado!');
            return void WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: 'Número não encontrado!', attachment: message.attachment != null, contact });
        }
    }

    contact = findContact.wid.user;

    const result = await sendWPPMessage({ contact, ...message });
    return result?.sendMsgResult.then(value => {
        const result = (value as any).messageSendResult ?? value;
        if (result !== window.WPP.whatsapp.enums.SendMsgResult.OK) {
            throw new Error('Falha ao enviar a mensagem: ' + value);
        } else {
            WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 3, message: 'Mensagem enviada com sucesso!', attachment: message.attachment != null, contact: contact });
        }
    });
}

async function addToQueue(message: Message) {
    try {
        const messageHash = AsyncStorageManager.calculateMessageHash(message);
        await storageManager.storeMessage(message, messageHash);
        await asyncQueue.add({ eventHandler: sendMessage, detail: { contact: message.contact, hash: messageHash, delay: message.delay } });
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
            window.WPP.webpack!.onReady(async () => {
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
    if (window.WPP.isReady) {
        return archiveAllChats(payload);
    } else {
        return new Promise((resolve, reject) => {
            window.WPP.webpack!.onReady(async () => {
                try {
                    resolve(await archiveAllChats(payload));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
});

storageManager.clearDatabase();

WPPRuntime.webpack?.onInjected(() => {
    console.log('Wppconnect: Loader injected!');
});

WPPRuntime.webpack?.injectLoader();
