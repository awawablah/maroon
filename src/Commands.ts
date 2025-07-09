import { Command } from "./Command";
import { Hello } from "./commands/hello";
import {
  Submit,
  FindApproved,
  RemoveSubmission,
  ListSubmissions,
} from "./commands/submit";
import { WwydTest, WwydStatus } from "./commands/wwydstatus";
import { Ping } from "./commands/ping";
import {
  Warn,
  WarnList,
  WarnPermissions,
  RemoveWarn,
  ClearUserWarns,
  BulkRemoveWarns,
  WarnLeaderboard,
  Ban,
  Kick,
  ModerationLog,
  BanKickPermissions,
} from "./commands/moderation/warn";

export const Commands: Command[] = [
  Hello,
  Submit,
  FindApproved,
  RemoveSubmission,
  ListSubmissions,
  WwydTest,
  WwydStatus,
  Ping,
  Warn,
  WarnList,
  WarnPermissions,
  RemoveWarn,
  ClearUserWarns,
  BulkRemoveWarns,
  WarnLeaderboard,
  Ban,
  Kick,
  ModerationLog,
  BanKickPermissions,
];
