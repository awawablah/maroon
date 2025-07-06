import { Client, REST, Routes } from "discord.js";
import { Commands } from "../Commands";
import { config } from "dotenv";
config();

export default (client: Client): void => {
  client.once("ready", async () => {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN!,
    );

    try {
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID!,
          process.env.GUILD_ID!,
        ),
        { body: Commands },
      );

      console.log("✅ Guild commands registered.");
    } catch (err) {
      console.error("❌ Command registration failed:", err);
    }
  });
};
