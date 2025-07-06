import { CommandInteraction, Client, TextChannel } from "discord.js";
import { Command } from "../Command";
import * as fs from "fs";
import * as path from "path";

const ADMIN_CHANNEL_ID = "1234567890";

export const Submit: Command = {
  name: "submit",
  description: "Send a private submission for admin review",
  run: async (client: Client, interaction: CommandInteraction) => {
    await interaction.reply({
      ephemeral: true,
      content: "Check your DMs to complete your submission!",
    });

    try {
      const dm = await interaction.user.createDM();
      await dm.send("Please submit your what would you do reply here.");
      const msg = await dm.awaitMessages({
        filter: (m) => m.author.id === interaction.user.id,
        max: 1,
        time: 60000,
        errors: ["time"],
      });
      await dm.send("Thank you for your submission!");
      const submission = msg.first()?.content;
      if (!submission) throw new Error("No message received.");
      // Save to log file
      const logData = {
        timestamp: new Date().toISOString(),
        userId: interaction.user.id,
        username: interaction.user.username,
        submission: submission,
      };
      const logFilePath = path.join(process.cwd(), "userwwydprompts.json");
      let existingData = [];

      try {
        if (fs.existsSync(logFilePath)) {
          const fileContent = fs.readFileSync(logFilePath, "utf8");
          existingData = JSON.parse(fileContent);
        }
      } catch (error) {
        console.error("Error reading log file:", error);
      }
      existingData.push(logData);

      try {
        fs.writeFileSync(logFilePath, JSON.stringify(existingData, null, 2));
        console.log("Submission saved to log file");
      } catch (error) {
        console.error("Error writing to log file:", error);
      }

      // Forward to admin review channel
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      if (adminChannel && adminChannel.isTextBased()) {
        (adminChannel as TextChannel).send({
          content: `📨 **New submission from <@${interaction.user.id}>:**\n${submission}`,
        });
      }

      await interaction.user.send(
        "✅ Your submission has been sent to the admins!",
      );
    } catch (error) {
      console.error(error);
      await interaction.followUp({
        ephemeral: true,
        content: "An error occurred while submitting your message.",
      });
    }
  },
};
