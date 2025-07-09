import { Command } from "./Command";
import { Hello } from "./commands/hello";
import { Submit, FindApproved, RemoveSubmission } from "./commands/submit";
import { WwydTest, WwydStatus } from "./commands/wwydstatus";
import { Ping } from "./commands/ping";
import {
  Warn,
  WarnList,
  WarnPermissions,
  RemoveWarn,
  ClearUserWarns,
  BulkRemoveWarns,
  WarnStats,
} from "./commands/moderation/warn";

export const Commands: Command[] = [
  Hello,
  Submit,
  FindApproved,
  RemoveSubmission,
  WwydTest,
  WwydStatus,
  Ping,
  Warn,
  WarnList,
  WarnPermissions,
  RemoveWarn,
  ClearUserWarns,
  BulkRemoveWarns,
  WarnStats,
];
