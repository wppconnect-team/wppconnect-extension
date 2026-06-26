import ChromeMessageContentTypes from "types/ChromeMessageContentTypes";

type MessageData<K extends keyof ChromeMessageContentTypes> = {
  source: 'Wppconnect';
  type: K;
  payload: ChromeMessageContentTypes[K]["payload"];
};

type MessageDataResponse<K extends keyof ChromeMessageContentTypes> = {
  source: 'Wppconnect';
  type: `${K}_RESPONSE`;
  payload: ChromeMessageContentTypes[K]["response"];
};

type MessageHandler<K extends keyof ChromeMessageContentTypes> = (
  payload: ChromeMessageContentTypes[K]["payload"]
) => ChromeMessageContentTypes[K]["response"] | Promise<ChromeMessageContentTypes[K]["response"]>;

const MESSAGE_TIMEOUT_MS = 5000;

export default class AsyncChromeMessageManager {
  constructor(private source: "popup" | "contentScript" | "webpage") {
    if (this.source === "contentScript") {
      this.forwardMessagesFromWebpageToPopup();
      this.forwardResponsesFromPopupToWebpage();
    }
  }

  private forwardMessagesFromWebpageToPopup() {
    window.addEventListener("message", (event) => {
      if (event.source === window && event.origin === window.location.origin && event.data.source === 'Wppconnect') {
        void chrome.runtime.sendMessage(event.data).catch((error) => {
          console.error('Wppconnect.AsyncChromeMessageManager.forwardMessagesFromWebpageToPopup', error, event);
          return;
        });
      }
    });
  }

  private forwardResponsesFromPopupToWebpage() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.source === 'Wppconnect') window.postMessage(message, window.location.origin);
    });
  }

  public addHandler<K extends keyof ChromeMessageContentTypes>(type: K, handler: MessageHandler<K>) {
    try {
      if (this.source !== "webpage") {
        this.addExtensionMessageHandler(type, handler);
      }
      if (this.source !== "popup") {
        this.addWebpageMessageHandler(type, handler);
      }
    } catch (error) {
      console.error('Wppconnect.AsyncChromeMessageManager.addHandler', error);
    }
  }

  private addWebpageMessageHandler<K extends keyof ChromeMessageContentTypes>(type: K, handler: MessageHandler<K>) {
    window.addEventListener("message", async (event) => {
      if (event.source === window && event.origin === window.location.origin && event.data.type === type && event.data.source === 'Wppconnect') {
        try {
          const response = await handler(event.data.payload)
          window.postMessage({ source: 'Wppconnect', type: `${type}_RESPONSE`, payload: response }, window.location.origin);
        } catch (error) {
          console.error(`Wppconnect.AsyncChromeMessageManager.addWebpageMessageHandler ${type}_RESPONSE`, error);
        }
      }
    });
  }

  private addExtensionMessageHandler<K extends keyof ChromeMessageContentTypes>(type: K, handler: MessageHandler<K>) {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.source === 'Wppconnect' && message.type === type) {
        try {
          const response = await handler(message.payload);
          void chrome.runtime.sendMessage({ source: 'Wppconnect', type: `${type}_RESPONSE`, payload: response });
        } catch (error) {
          console.error(`Wppconnect.AsyncChromeMessageManager.addExtensionMessageHandler ${type}_RESPONSE`, error);
        }
      }
    });
  }

  public async sendMessage<K extends keyof ChromeMessageContentTypes>(
    type: K,
    payload: ChromeMessageContentTypes[K]["payload"]
  ): Promise<ChromeMessageContentTypes[K]["response"]> {
    const message: MessageData<K> = {  source: 'Wppconnect', type, payload };

    return new Promise((resolve, reject) => {
      let removeWebpageListener = () => {};
      let timeoutId = 0;
      let runtimeListener: ((response: MessageDataResponse<K>) => void) | undefined;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (runtimeListener) chrome.runtime.onMessage.removeListener(runtimeListener);
        removeWebpageListener();
      };

      try {
        const listener = (response: MessageDataResponse<K>) => {
          if (response.source === 'Wppconnect' && response.type === `${type}_RESPONSE`) {
            cleanup();
            resolve(response.payload);
          }
        };
        runtimeListener = listener;

        timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error(`Wppconnect message timeout: ${type}`));
        }, MESSAGE_TIMEOUT_MS);

        if (this.source !== "popup") {
          removeWebpageListener = this.sendWebpageMessage(message, listener);
        }
        if (this.source !== "webpage") {
          this.sendExtensionMessage(message, listener, (error) => {
            cleanup();
            reject(error);
          });
        }
      } catch (error) {
        cleanup();
        console.error('Wppconnect.AsyncChromeMessageManager.sendMessage', error)
        reject(error);
      }
    });
  }

  private sendWebpageMessage<K extends keyof ChromeMessageContentTypes>(
    message: MessageData<K>, listener: (response: MessageDataResponse<K>) => void
  ) {
    window.postMessage(message, window.location.origin);
    const responseListener = (event: MessageEvent) => {
      if (event.source === window && event.origin === window.location.origin && event.data.source === 'Wppconnect' && event.data.type === `${message.type}_RESPONSE`) {
        listener(event.data);
        window.removeEventListener("message", responseListener);
      }
    };
    window.addEventListener("message", responseListener);
    return () => window.removeEventListener("message", responseListener);
  }

  private sendExtensionMessage<K extends keyof ChromeMessageContentTypes>(
    message: MessageData<K>,
    listener: (response: MessageDataResponse<K>) => void,
    reject: (error: Error) => void
  ) {
    chrome.runtime.onMessage.addListener(listener);

    if (this.source === "popup") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('Nenhuma aba ativa encontrada para conectar a extensão.'));
          return;
        }

        const response = chrome.tabs.sendMessage(tabs[0].id, message);
        void response.catch((error) => {
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } else if (this.source === "contentScript") {
      void chrome.runtime.sendMessage(message).catch((error) => {
        console.error('Wppconnect.AsyncChromeMessageManager.sendExtensionMessage', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }
}
