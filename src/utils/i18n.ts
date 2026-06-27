export type AppLanguage = 'en' | 'pt_BR';

type LocaleMessage = {
  message?: string;
  placeholders?: Record<string, { content?: string }>;
};

type LocaleMessages = Record<string, LocaleMessage>;

let activeMessages: LocaleMessages = {};
const nativeGetMessage = chrome.i18n.getMessage.bind(chrome.i18n);
const nativeGetUILanguage = chrome.i18n.getUILanguage.bind(chrome.i18n);
let activeLanguage: AppLanguage = detectBrowserLanguage();

export function detectBrowserLanguage(): AppLanguage {
  const language = nativeGetUILanguage();
  return language === 'pt_BR' || language.toLowerCase().startsWith('pt') ? 'pt_BR' : 'en';
}

export function normalizeLanguage(language?: string): AppLanguage {
  return language === 'pt_BR' ? 'pt_BR' : 'en';
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}

function storageGet<T extends Record<string, unknown>>(defaults: T): Promise<T> {
  return new Promise(resolve => chrome.storage.local.get(defaults, data => resolve(data as T)));
}

function storageSet(values: Record<string, unknown>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(values, resolve));
}

function normalizeSubstitutions(substitutions?: string | string[]) {
  if (!substitutions) return [];
  return Array.isArray(substitutions) ? substitutions : [substitutions];
}

function formatMessage(entry: LocaleMessage | undefined, substitutions?: string | string[]) {
  if (!entry?.message) return '';

  const values = normalizeSubstitutions(substitutions);
  let message = entry.message;

  Object.entries(entry.placeholders || {}).forEach(([name, placeholder]) => {
    const match = placeholder.content?.match(/^\$(\d+)$/);
    if (!match) return;
    const value = values[Number(match[1]) - 1] || '';
    message = message.replace(new RegExp(`\\$${name}\\$`, 'gi'), value);
  });

  values.forEach((value, index) => {
    message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), value);
  });

  return message;
}

export function getMessage(key: string, substitutions?: string | string[]) {
  return formatMessage(activeMessages[key], substitutions) || nativeGetMessage(key, substitutions as any);
}

function patchChromeI18n() {
  try {
    (chrome.i18n as any).getMessage = getMessage;
    (chrome.i18n as any).getUILanguage = () => activeLanguage;
  } catch (error) {
    // Chrome APIs are not expected to be readonly, but keep native behavior if a test shim is.
  }
}

export async function setLanguagePreference(language: AppLanguage) {
  await storageSet({ language, resolvedLanguage: language });
}

export async function initI18n() {
  const browserLanguage = detectBrowserLanguage();
  const data = await storageGet<{ language: string; resolvedLanguage: string }>({ language: browserLanguage, resolvedLanguage: browserLanguage });
  const storedLanguage = data.language === 'auto' ? browserLanguage : normalizeLanguage(String(data.language || browserLanguage));

  activeLanguage = storedLanguage;

  if (data.language !== storedLanguage || data.resolvedLanguage !== storedLanguage) {
    await setLanguagePreference(storedLanguage);
  }

  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${storedLanguage}/messages.json`));
    activeMessages = await response.json();
  } catch (error) {
    activeMessages = {};
  }

  patchChromeI18n();
  return activeLanguage;
}
