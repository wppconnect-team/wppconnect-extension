export type ArchivePhase = 'idle' | 'starting' | 'listing' | 'archiving' | 'finished' | 'cancelled' | 'error';

export default interface ArchiveStatus {
    isProcessing: boolean;
    phase: ArchivePhase;
    totalItems: number;
    totalChats?: number;
    archivedChats?: number;
    processedItems: number;
    remainingItems: number;
    failedItems: number;
    elapsedTime: number;
    currentChat?: string;
    error?: string;
    failedChats?: Array<{ chatId?: string; message: string }>;
    waiting: number | false;
    aborted: boolean;
}
