import { CommandInteraction, Client, MessageFlags } from "discord.js";
import { Command } from "../Command";

export const Hello: Command = {
  name: "hello",
  description: "Returns a greeting",
  run: async (client: Client, interaction: CommandInteraction) => {
    const content = "Hello there!";

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content,
    });
  },
};
