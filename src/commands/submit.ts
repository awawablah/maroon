import {
  CommandInteraction,
  Client,
  TextChannel,
  MessageFlags,
  DMChannel,
} from "discord.js";
import { Command } from "../Command";
import * as fs from "fs";
import * as path from "path";

const ADMIN_CHANNEL_ID = "1391277749695549583";

export const Submit: Command = {
  name: "submit",
  description: "Send a private submission for admin review",
  run: async (client: Client, interaction: CommandInteraction) => {
    console.log("🔔 /submit command triggered by", interaction.user.tag);

    await interaction.reply({
      content: "📩 Check your DMs to complete your submission!",
      flags: MessageFlags.Ephemeral,
    });

    try {
      const dm = await interaction.user.send(
        "📝 Please submit your **What Would You Do?** reply here within 60 seconds.",
      );

      console.log("⌛ Waiting for DM from:", interaction.user.tag);

      const collected = await (dm.channel as DMChannel).awaitMessages({
        filter: (m) => m.author.id === interaction.user.id,
        max: 1,
        time: 60000,
        errors: ["time"],
      });

      const submission = collected.first()?.content;

      if (!submission) throw new Error("No message received.");

      await interaction.user.send("✅ Thank you for your submission!");

      // Log submission to file
      const logData = {
        timestamp: new Date().toISOString(),
        userId: interaction.user.id,
        username: interaction.user.username,
        submission,
      };

      const logFilePath = path.join(process.cwd(), "userwwydprompts.json");
      let existingData = [];

      try {
        if (fs.existsSync(logFilePath)) {
          const fileContent = fs.readFileSync(logFilePath, "utf8");
          if (fileContent.trim().length > 0)
            existingData = JSON.parse(fileContent);
          else existingData = [];
        }
      } catch (error) {
        console.error("📂 Error reading log file:", error);
      }

      existingData.push(logData);

      try {
        fs.writeFileSync(logFilePath, JSON.stringify(existingData, null, 2));
        console.log("📁 Submission saved to log file");
      } catch (error) {
        console.error("❌ Error writing to log file:", error);
      }

      // Forward to admin channel
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      if (adminChannel && adminChannel.isTextBased()) {
        (adminChannel as TextChannel).send({
          content: `📨 **New submission from <@${interaction.user.id}>:**\n${submission}`,
        });
      }

      console.log("✅ Submission forwarded to admin channel");
    } catch (error: any) {
      console.error("❌ Error during submission:", error);

      if (error.code === "time") {
        await interaction.followUp({
          content: "⏰ You didn’t respond in time. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.followUp({
          content: "❌ Something went wrong while collecting your message.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
