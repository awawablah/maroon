import { Command } from "./Command";
import { Hello } from "./commands/hello";
import { Submit } from "./commands/submit";

export const Commands: Command[] = [Hello, Submit];
