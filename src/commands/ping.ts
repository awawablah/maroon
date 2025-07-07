import { CommandInteraction, Client, MessageFlags } from "discord.js";
import { Command } from "../Command";

export const Ping: Command = {
  name: "ping",
  description: "Sanity check",
  run: async (client: Client, interaction: CommandInteraction) => {
    let content = `Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`;

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content,
    });
  },
};
