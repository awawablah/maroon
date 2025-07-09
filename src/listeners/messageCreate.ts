import { Client, Message } from "discord.js";
import { handleWwydMessage } from "../handlers/wwydHandler";

export default (client: Client): void => {
  client.on("messageCreate", async (message: Message) => {
    // Handle WWYD messages
    await handleWwydMessage(message, client);
  });
};
