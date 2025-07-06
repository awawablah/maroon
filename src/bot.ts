import { Client } from "discord.js";
import { config } from "./config";
import interactionCreate from "./listeners/interactionCreate";
import ready from "./listeners/ready";
import fs from "fs";

const client = new Client({
  intents: [],
});

function createFileAsync(filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, "", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

if (!fs.existsSync("userWwydPrompts.json"))
  createFileAsync("userWwydPrompts.json");

ready(client);
interactionCreate(client);

client.login(config.DISCORD_TOKEN);
