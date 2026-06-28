import type QueueStatus from '../types/QueueStatus';

interface QueueItem<T = any> {
    eventHandler: (detail: T) => Promise<unknown>;
    detail: T;
}

class AsyncEventQueue {
    private queue: QueueItem[] = [];
    private isProcessing: boolean = false;
    private startTime: number = 0;
    private endTime: number = 0;
    private processedItems: number = 0;
    private failedItems: number = 0;
    private remainingItems: number = 0;
    private items: { detail: any; startTime: number; elapsedTime: number; error?: string }[] = [];
    private sendingMessage: number | false = false;
    private waiting: number | false = false;
    private aborted: boolean = false;
    private paused: boolean = false;
    private activeItem: boolean = false;
    private activeItemDetail: any = undefined;
    private pausePromiseResolve: ((value?: unknown) => void) | null = () => { };

    private async wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public add<T extends { delay?: number; }>({ eventHandler, detail }: QueueItem<T>) {
        this.queue.push({ eventHandler, detail });

        if (!this.isProcessing) {
            this.aborted = false;
            this.isProcessing = true;
            this.startTime = Date.now();
            this.endTime = 0;
            this.processedItems = 0;
            this.failedItems = 0;
            this.items = [];

            window.setTimeout(() => void this.process(), 0);
        }

        return this.getStatus();
    }

    private async process() {
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
                this.activeItemDetail = item.detail;
                this.sendingMessage = Date.now();
                try {
                    await item.eventHandler(item.detail);
                    this.processedItems++;
                    const elapsedTime = Date.now() - startTime;
                    this.items.push({ detail: item.detail, startTime, elapsedTime });
                } catch (error) {
                    this.failedItems++;
                    const elapsedTime = Date.now() - startTime;
                    this.items.push({
                        detail: item.detail,
                        startTime,
                        elapsedTime,
                        error: error instanceof Error ? error.message : String(error)
                    });
                } finally {
                    this.sendingMessage = false;
                    this.activeItem = false;
                    this.activeItemDetail = undefined;
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
            this.activeItemDetail = undefined;
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

    public hasPendingItems(batchId?: string) {
        if (!batchId) return this.isProcessing;

        return this.queue.some(item => item.detail?.batchId === batchId)
            || this.activeItemDetail?.batchId === batchId;
    }

    public getStatus(batchId?: string): QueueStatus {
        const completedItems = batchId
            ? this.items.filter(item => item.detail?.batchId === batchId)
            : this.items;
        const queueItems = batchId
            ? this.queue.filter(item => item.detail?.batchId === batchId)
            : this.queue;
        const activeItemCount = this.activeItem && (!batchId || this.activeItemDetail?.batchId === batchId) ? 1 : 0;
        const processedItems = completedItems.filter(item => !item.error).length;
        const failedItems = completedItems.filter(item => item.error).length;

        return {
            elapsedTime: this.isProcessing ? Date.now() - this.startTime : this.endTime - this.startTime,
            isProcessing: batchId ? this.hasPendingItems(batchId) : this.isProcessing,
            items: completedItems,
            sendingMessage: this.sendingMessage === false ? this.sendingMessage : Date.now() - this.sendingMessage,
            waiting: this.waiting === false ? this.waiting : Date.now() - this.waiting,
            processedItems: batchId ? processedItems : this.processedItems,
            failedItems: batchId ? failedItems : this.failedItems,
            remainingItems: batchId
                ? queueItems.length + activeItemCount
                : this.aborted ? this.remainingItems : this.queue.length + activeItemCount,
            totalItems: (batchId ? processedItems + failedItems : this.processedItems + this.failedItems) + queueItems.length + activeItemCount,
        };
    }
}

const asyncQueue = new AsyncEventQueue();

export default asyncQueue;
