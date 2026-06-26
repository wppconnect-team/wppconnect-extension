import Log from "./Log";
import { Message } from "./Message";
import QueueStatus from "./QueueStatus";
import ArchiveStatus from "./ArchiveStatus";
import { WaJsLabPayload, WaJsLabResponse } from "./WaJsLab";
import { ChromeMessageTypes } from "./ChromeMessageTypes";

export default interface ChromeMessageContentTypes {
  [ChromeMessageTypes.QUEUE_STATUS]: {
    payload: undefined;
    response: QueueStatus;
  };
  [ChromeMessageTypes.SEND_MESSAGE]: {
    payload: Message;
    response: boolean;
  };
  [ChromeMessageTypes.ADD_LOG]: {
    payload: Log;
    response: boolean;
  };
  [ChromeMessageTypes.PAUSE_QUEUE]: {
    payload: undefined;
    response: boolean;
  };
  [ChromeMessageTypes.RESUME_QUEUE]: {
    payload: undefined;
    response: boolean;
  };
  [ChromeMessageTypes.STOP_QUEUE]: {
    payload: undefined;
    response: boolean;
  };
  [ChromeMessageTypes.ARCHIVE_ALL_CHATS]: {
    payload: {
      delayMs: number;
    };
    response: boolean;
  };
  [ChromeMessageTypes.ARCHIVE_STATUS]: {
    payload: undefined;
    response: ArchiveStatus;
  };
  [ChromeMessageTypes.WAJS_LAB_EXECUTE]: {
    payload: WaJsLabPayload;
    response: WaJsLabResponse;
  };
}
