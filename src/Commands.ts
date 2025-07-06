import { Command } from "./Command";
import { Hello } from "./commands/hello";
import { Submit, FindApproved, RemoveSubmission } from "./commands/submit";

export const Commands: Command[] = [
  Hello,
  Submit,
  FindApproved,
  RemoveSubmission,
];
