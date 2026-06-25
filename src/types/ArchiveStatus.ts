export default interface ArchiveStatus {
    isProcessing: boolean;
    totalItems: number;
    processedItems: number;
    remainingItems: number;
    failedItems: number;
    elapsedTime: number;
    currentChat?: string;
    waiting: number | false;
    aborted: boolean;
}
