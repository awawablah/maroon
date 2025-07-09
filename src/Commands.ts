import { Command } from "./Command";
import { Hello } from "./commands/hello";
import { Submit, FindApproved, RemoveSubmission } from "./commands/submit";
import { WwydTest, WwydStatus } from "./commands/wwydstatus";
import { Ping } from "./commands/ping";

export const Commands: Command[] = [
  Hello,
  Submit,
  FindApproved,
  RemoveSubmission,
  WwydTest,
  WwydStatus,
  Ping,
];
