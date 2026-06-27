import type QueueStatus from '../types/QueueStatus';

interface QueueItem<T = any> {
    eventHandler: (detail: T) => Promise<void>;
    detail: T;
}

class AsyncEventQueue {
    private queue: QueueItem[] = [];
    private isProcessing: boolean = false;
    private startTime: number = 0;
    private endTime: number = 0;
    private processedItems: number = 0;
    private remainingItems: number = 0;
    private items: { detail: any; startTime: number; elapsedTime: number }[] = [];
    private sendingMessage: number | false = false;
    private waiting: number | false = false;
    private aborted: boolean = false;
    private paused: boolean = false;
    private activeItem: boolean = false;
    private pausePromiseResolve: ((value?: unknown) => void) | null = () => { };

    private async wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async add<T extends { delay?: number; }>({ eventHandler, detail }: QueueItem<T>) {
        this.queue.push({ eventHandler, detail });

        if (!this.isProcessing) {
            this.aborted = false;
            this.isProcessing = true;
            this.startTime = Date.now();
            this.processedItems = 0;
            this.items = [];

            try {
                while (this.queue.length > 0) {
                    if (this.paused) {
                        await new Promise(resolve => {
                            this.pausePromiseResolve = resolve;
                        });
                    }

                    if (this.aborted) {
                        this.remainingItems = this.queue.length;
                        this.queue = [];
                        break;
                    }

                    const item = this.queue.shift();
                    if (item === undefined) continue;
                    const startTime = Date.now();
                    this.activeItem = true;
                    this.sendingMessage = Date.now();
                    try {
                        await item.eventHandler(item.detail);
                        this.processedItems++;
                        const elapsedTime = Date.now() - startTime;
                        this.items.push({ detail: item.detail, startTime, elapsedTime });
                    } finally {
                        this.sendingMessage = false;
                        this.activeItem = false;
                    }
                    if (item.detail.delay && this.queue.length !== 0) {
                        this.waiting = Date.now();
                        const waitStart = Date.now();
                        const waitTarget = item.detail.delay * 1000;
                        while (Date.now() - waitStart < waitTarget) {
                            await this.wait(100);
                            if (this.paused) {
                                await new Promise(resolve => {
                                    this.pausePromiseResolve = resolve;
                                });
                            }

                            if (this.aborted) {
                                this.remainingItems = this.queue.length;
                                this.queue = [];
                                break;
                            }
                        }
                        this.waiting = false;
                    }
                }
            } finally {
                this.endTime = Date.now();
                this.isProcessing = false;
                this.sendingMessage = false;
                this.waiting = false;
                this.activeItem = false;
            }
        }
    }

    public pause() {
        this.paused = true;
    }

    public resume() {
        if (this.paused && this.pausePromiseResolve) {
            this.paused = false;
            this.pausePromiseResolve();
            this.pausePromiseResolve = null;
        }
    }

    public stop() {
        this.aborted = true;
        if (this.paused) {
            this.resume();
        }
    }

    public getStatus(): QueueStatus {
        return {
            elapsedTime: this.isProcessing ? Date.now() - this.startTime : this.endTime - this.startTime,
            isProcessing: this.isProcessing,
            items: this.items,
            sendingMessage: this.sendingMessage === false ? this.sendingMessage : Date.now() - this.sendingMessage,
            waiting: this.waiting === false ? this.waiting : Date.now() - this.waiting,
            processedItems: this.processedItems,
            remainingItems: this.aborted ? this.remainingItems : this.queue.length + (this.activeItem ? 1 : 0),
            totalItems: this.processedItems + this.queue.length + (this.activeItem ? 1 : 0),
        };
    }
}

const asyncQueue = new AsyncEventQueue();

export default asyncQueue;
