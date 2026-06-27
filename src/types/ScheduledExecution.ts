import type { Attachment } from './Attachment';
import type { MessageButtonsTypes } from '@wppconnect/wa-js/dist/chat/functions/prepareMessageButtons';
import type { WaJsLabPayload } from './WaJsLab';

export type ScheduledExecutionStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ScheduledExecutionPayload =
  | {
    kind: 'wajs';
    labPayload: WaJsLabPayload;
  }
  | {
    kind: 'bulkSend';
    contacts: string[];
    message: string;
    attachment: Attachment;
    buttons: MessageButtonsTypes[];
    delay?: number;
  }
  | {
    kind: 'archiveChats';
    delayMs: number;
  };

export type ScheduledExecution = {
  id: string;
  label: string;
  target: string;
  scheduledAt: number;
  createdAt: number;
  updatedAt: number;
  status: ScheduledExecutionStatus;
  payload: ScheduledExecutionPayload;
  result?: unknown;
  error?: string;
};
