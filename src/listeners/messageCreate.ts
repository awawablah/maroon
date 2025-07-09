import { Client, Message } from "discord.js";
import { handleWwydMessage } from "../handlers/wwydHandler";
import { handleModifyWarnCommand } from "../commands/moderation/warn";

export default (client: Client): void => {
  client.on("messageCreate", async (message: Message) => {
    // Skip bot messages
    if (message.author.bot) return;

    // Handle ..!modifywarn command
    if (handleModifyWarnCommand(message)) {
      return;
    }

    // Handle WWYD messages
    await handleWwydMessage(message, client);
  });
};
