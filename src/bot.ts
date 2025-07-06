import { Client } from "discord.js";
import { config } from "./config";
import interactionCreate from "./listeners/interactionCreate";
import ready from "./listeners/ready";

const client = new Client({
  intents: [],
});

ready(client);
interactionCreate(client);

client.login(config.DISCORD_TOKEN);
