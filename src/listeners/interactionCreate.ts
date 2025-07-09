import {
  ChatInputCommandInteraction,
  Client,
  Interaction,
  MessageFlags,
} from "discord.js";
import { Commands } from "../Commands";

export default (client: Client): void => {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(client, interaction);
    }
  });
};

const handleSlashCommand = async (
  client: Client,
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const slashCommand = Commands.find((c) => c.name === interaction.commandName);
  if (!slashCommand) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ This command doesn't exist.",
          flags: MessageFlags.Ephemeral,
        })
        .catch((err) => console.error("Reply failure:", err));
    }
    return;
  }

  try {
    await slashCommand.run(client, interaction);
  } catch (err) {
    console.error(err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          flags: MessageFlags.Ephemeral,
          content: "❌ An error occurred while executing this command.",
        })
        .catch((err) => console.error("Reply failure:", err));
    } else {
      await interaction
        .followUp({
          flags: MessageFlags.Ephemeral,
          content: "❌ An error occurred after the reply.",
        })
        .catch((err) => console.error("FollowUp failure:", err));
    }
  }
};
