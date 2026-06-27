export type ExecutionHistoryDetails = {
    label: string;
    status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'info';
    target?: string;
    scheduledAt?: number;
    createdAt?: number;
    updatedAt?: number;
    payload?: unknown;
    result?: unknown;
    error?: string;
};

export default interface Log {
    id?: string;
    level: number;
    message: string;
    attachment: boolean;
    contact: string;
    date?: string;
    executionDetails?: ExecutionHistoryDetails;
}
