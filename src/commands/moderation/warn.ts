import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  MessageFlags,
  User,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ButtonInteraction,
  Message,
} from "discord.js";
import { Command } from "../../Command";
import fs from "fs";
import path from "path";

interface WarnData {
  id: string;
  userId: string;
  username: string;
  warnedBy: string;
  warnedById: string;
  reason: string;
  timestamp: string;
  channelId: string;
  channelName: string;
  guildId: string;
}

interface WarnConfig {
  allowedRoles: string[];
}

const WARN_DATA_FILE = path.join(process.cwd(), "warn_data.json");
const WARN_CONFIG_FILE = path.join(process.cwd(), "warn_config.json");

// Initialize files if they don't exist
function initializeFiles(): void {
  if (!fs.existsSync(WARN_DATA_FILE)) {
    fs.writeFileSync(WARN_DATA_FILE, "[]");
  }
  if (!fs.existsSync(WARN_CONFIG_FILE)) {
    const defaultConfig: WarnConfig = { allowedRoles: [] };
    fs.writeFileSync(WARN_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

function loadWarnData(): WarnData[] {
  try {
    const data = fs.readFileSync(WARN_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading warn data:", error);
    return [];
  }
}

function saveWarnData(data: WarnData[]): void {
  try {
    fs.writeFileSync(WARN_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving warn data:", error);
  }
}

function loadWarnConfig(): WarnConfig {
  try {
    const data = fs.readFileSync(WARN_CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading warn config:", error);
    return { allowedRoles: [] };
  }
}

function saveWarnConfig(config: WarnConfig): void {
  try {
    fs.writeFileSync(WARN_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving warn config:", error);
  }
}

function canUserWarn(interaction: ChatInputCommandInteraction): boolean {
  // Check if user has Administrator permission
  if (interaction.memberPermissions?.has("Administrator")) {
    return true;
  }

  // Check if user has any of the allowed roles
  const config = loadWarnConfig();
  const member = interaction.member;

  if (!member || !member.roles || config.allowedRoles.length === 0) {
    return false;
  }

  const memberRoles = Array.isArray(member.roles)
    ? member.roles
    : member.roles.cache.map((role) => role.id);

  return config.allowedRoles.some((roleId) => memberRoles.includes(roleId));
}

function generateWarnId(): string {
  return `warn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export const Warn: Command = {
  name: "warn",
  description: "Warn a user for a specific reason",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "The user to warn",
      required: true,
    },
    {
      name: "reason",
      type: 3, // STRING
      description: "The reason for the warning",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check permissions
    if (!canUserWarn(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to use the warn command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const channel = interaction.channel as TextChannel;

    // Prevent warning bots
    if (targetUser.bot) {
      await interaction.reply({
        content: "❌ You cannot warn bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Prevent self-warning
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot warn yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const warnData: WarnData = {
      id: generateWarnId(),
      userId: targetUser.id,
      username: targetUser.username,
      warnedBy: interaction.user.username,
      warnedById: interaction.user.id,
      reason: reason,
      timestamp: new Date().toISOString(),
      channelId: channel.id,
      channelName: channel.name,
      guildId: interaction.guildId!,
    };

    // Save to database
    const warns = loadWarnData();
    warns.push(warnData);
    saveWarnData(warns);

    // Create public embed
    const publicEmbed = new EmbedBuilder()
      .setTitle("⚠️ User Warned")
      .setColor(0xffaa00)
      .addFields(
        { name: "User", value: `<@${targetUser.id}>`, inline: true },
        { name: "Warned by", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Reason", value: reason, inline: false },
        {
          name: "Time",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: `Warning ID: ${warnData.id}` });

    // Send public message
    await interaction.reply({
      embeds: [publicEmbed],
    });

    // Send DM to warned user
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle("⚠️ You Have Been Warned")
        .setColor(0xff0000)
        .addFields(
          { name: "Warned by", value: interaction.user.username, inline: true },
          {
            name: "Server",
            value: interaction.guild?.name || "Unknown",
            inline: true,
          },
          { name: "Channel", value: `#${channel.name}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          {
            name: "Time",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({
          text: "Please follow the server rules to avoid further warnings.",
        });

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.error("Failed to send DM to warned user:", error);
      await interaction.followUp({
        content:
          "⚠️ Warning issued successfully, but couldn't send DM to the user (DMs might be disabled).",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const WarnList: Command = {
  name: "warnlist",
  description: "List all warnings with pagination",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "Filter warnings for a specific user",
      required: false,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check permissions
    if (!canUserWarn(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to view warnings.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user");
    let warns = loadWarnData();

    // Filter by guild
    warns = warns.filter((warn) => warn.guildId === interaction.guildId);

    // Filter by user if specified
    if (targetUser) {
      warns = warns.filter((warn) => warn.userId === targetUser.id);
    }

    // Sort by timestamp (newest first)
    warns.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (warns.length === 0) {
      const message = targetUser
        ? `No warnings found for ${targetUser.username}.`
        : "No warnings found in this server.";

      await interaction.reply({
        content: `📋 ${message}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(warns.length / itemsPerPage);
    let currentPage = 1;

    const generateEmbed = (page: number) => {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageWarns = warns.slice(startIndex, endIndex);

      const title = targetUser
        ? `⚠️ Warnings for ${targetUser.username}`
        : "⚠️ Server Warnings";

      const embed = new EmbedBuilder()
        .setTitle(`${title} (Page ${page}/${totalPages})`)
        .setColor(0xffaa00)
        .setTimestamp()
        .setFooter({ text: `Total warnings: ${warns.length}` });

      pageWarns.forEach((warn, index) => {
        const warnDate = new Date(warn.timestamp);
        const timeString = `<t:${Math.floor(warnDate.getTime() / 1000)}:R>`;

        embed.addFields({
          name: `${startIndex + index + 1}. ${warn.username}`,
          value: `**Reason:** ${warn.reason}\n**Warned by:** ${warn.warnedBy}\n**Channel:** #${warn.channelName}\n**Time:** ${timeString}\n**ID:** \`${warn.id}\``,
          inline: false,
        });
      });

      return embed;
    };

    const generateButtons = (page: number) => {
      const row = new ActionRowBuilder<ButtonBuilder>();

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("warn_prev")
          .setLabel("◀️ Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),

        new ButtonBuilder()
          .setCustomId("warn_next")
          .setLabel("Next ▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages),
      );

      return row;
    };

    const embed = generateEmbed(currentPage);
    const buttons = generateButtons(currentPage);

    const response = await interaction.reply({
      embeds: [embed],
      components: totalPages > 1 ? [buttons] : [],
      flags: MessageFlags.Ephemeral,
    });

    if (totalPages > 1) {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: "❌ You can't use these buttons.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (buttonInteraction.customId === "warn_prev" && currentPage > 1) {
          currentPage--;
        } else if (
          buttonInteraction.customId === "warn_next" &&
          currentPage < totalPages
        ) {
          currentPage++;
        }

        const newEmbed = generateEmbed(currentPage);
        const newButtons = generateButtons(currentPage);

        await buttonInteraction.update({
          embeds: [newEmbed],
          components: [newButtons],
        });
      });

      collector.on("end", async () => {
        try {
          await response.edit({
            components: [],
          });
        } catch (error) {
          console.error("Error removing buttons:", error);
        }
      });
    }
  },
};

export function handleModifyWarnCommand(message: Message): boolean {
  // Check if message starts with ..!modifywarn
  if (!message.content.startsWith("..!modifywarn")) {
    return false;
  }

  initializeFiles();

  // Check if user has Administrator permission
  if (!message.member?.permissions.has("Administrator")) {
    message.reply(
      "❌ You must be a Discord Administrator to use this command.",
    );
    return true;
  }

  // Check if command was used in a guild
  if (!message.guild) {
    message.reply("❌ This command can only be used in a server.");
    return true;
  }

  // Parse the command: ..!modifywarn <@role> -> enable/disable
  const content = message.content.substring(13).trim(); // Remove "..!modifywarn "

  // Check if content is empty
  if (!content) {
    message.reply(
      "❌ Missing arguments. Use: `..!modifywarn <@role> -> enable/disable`\n\n**Examples:**\n• `..!modifywarn @Moderator -> enable`\n• `..!modifywarn @Helper -> disable`",
    );
    return true;
  }

  // Match pattern: <@&roleId> -> action or <@roleId> -> action
  const roleMatch = content.match(/^<@&?(\d+)>\s*->\s*(enable|disable)$/i);

  if (!roleMatch) {
    message.reply(
      "❌ Invalid syntax. Use: `..!modifywarn <@role> -> enable/disable`\n\n**Examples:**\n• `..!modifywarn @Moderator -> enable`\n• `..!modifywarn @Helper -> disable`\n\n**Make sure to:**\n• Mention the role with @\n• Use the exact syntax with spaces around `->`\n• Use either `enable` or `disable`",
    );
    return true;
  }

  const roleId = roleMatch[1];
  const action = roleMatch[2].toLowerCase();

  // Get the role
  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    message.reply(
      "❌ Role not found. Make sure the role exists and try again.",
    );
    return true;
  }

  // Prevent modifying @everyone role
  if (role.id === message.guild.id) {
    message.reply("❌ Cannot modify warn permissions for @everyone role.");
    return true;
  }

  const config = loadWarnConfig();

  try {
    if (action === "enable") {
      if (!config.allowedRoles.includes(role.id)) {
        config.allowedRoles.push(role.id);
        saveWarnConfig(config);
        message.reply(`✅ Enabled warn permissions for role **${role.name}**.`);
      } else {
        message.reply(`⚠️ Role **${role.name}** already has warn permissions.`);
      }
    } else if (action === "disable") {
      const index = config.allowedRoles.indexOf(role.id);
      if (index > -1) {
        config.allowedRoles.splice(index, 1);
        saveWarnConfig(config);
        message.reply(
          `✅ Disabled warn permissions for role **${role.name}**.`,
        );
      } else {
        message.reply(
          `⚠️ Role **${role.name}** doesn't have warn permissions.`,
        );
      }
    }
  } catch (error) {
    console.error("Error modifying warn permissions:", error);
    message.reply(
      "❌ An error occurred while modifying warn permissions. Please try again.",
    );
  }

  return true;
}

export const WarnPermissions: Command = {
  name: "warnpermissions",
  description: "View current warn role permissions (Admin only)",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check if user has Administrator permission
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content: "❌ You must be a Discord Administrator to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const config = loadWarnConfig();

    if (config.allowedRoles.length === 0) {
      await interaction.reply({
        content:
          "📋 **Current Warn Permissions:**\n\n❌ No roles have warn permissions.\n\n*Only Discord Administrators can use warn commands.*",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Warn Permissions")
      .setColor(0x0099ff)
      .setDescription("The following roles can use warn commands:")
      .setTimestamp();

    let rolesText = "";
    for (const roleId of config.allowedRoles) {
      try {
        const role = await interaction.guild?.roles.fetch(roleId);
        if (role) {
          rolesText += `• **${role.name}** (${role.id})\n`;
        } else {
          rolesText += `• *Unknown Role* (${roleId}) - Role may have been deleted\n`;
        }
      } catch (error) {
        rolesText += `• *Error fetching role* (${roleId})\n`;
      }
    }

    embed.addFields({
      name: "Allowed Roles",
      value: rolesText || "No valid roles found",
      inline: false,
    });

    embed.addFields({
      name: "Note",
      value:
        "Discord Administrators can always use warn commands regardless of role permissions.",
      inline: false,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
