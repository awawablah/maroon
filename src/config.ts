import dotenv from "dotenv";
import configJson from "./config.json";

dotenv.config();
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error("missing env variables");
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  ...configJson,
};

export type ConfigType = typeof config;
