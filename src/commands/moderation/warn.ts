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

    const itemsPerPage = 3;
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
        .setFooter({
          text: `Total warnings: ${warns.length} • Use /removewarn <id> to remove a warning`,
        });

      pageWarns.forEach((warn, index) => {
        const warnDate = new Date(warn.timestamp);
        const timeString = `<t:${Math.floor(warnDate.getTime() / 1000)}:R>`;

        // Create a more horizontal layout
        const reasonPreview =
          warn.reason.length > 80
            ? warn.reason.substring(0, 80) + "..."
            : warn.reason;

        embed.addFields({
          name: `📋 Warning #${startIndex + index + 1}`,
          value: `**User:** ${warn.username} • **Warned by:** ${warn.warnedBy} • **Time:** ${timeString}`,
          inline: false,
        });

        embed.addFields({
          name: `📝 Reason`,
          value: reasonPreview,
          inline: true,
        });

        embed.addFields({
          name: `📍 Location`,
          value: `#${warn.channelName}`,
          inline: true,
        });

        embed.addFields({
          name: `🔗 ID`,
          value: `\`${warn.id}\``,
          inline: true,
        });

        // Add a spacer between warnings
        if (index < pageWarns.length - 1) {
          embed.addFields({
            name: "\u200b",
            value:
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            inline: false,
          });
        }
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

export const RemoveWarn: Command = {
  name: "removewarn",
  description: "Remove a warning by ID",
  options: [
    {
      name: "id",
      type: 3, // STRING
      description: "The warning ID to remove",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check permissions
    if (!canUserWarn(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to remove warnings.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const warnId = interaction.options.getString("id", true);
    const warns = loadWarnData();

    // Find the warning
    const warnIndex = warns.findIndex(
      (warn) => warn.id === warnId && warn.guildId === interaction.guildId,
    );

    if (warnIndex === -1) {
      await interaction.reply({
        content: `❌ Warning with ID \`${warnId}\` not found in this server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const removedWarn = warns[warnIndex];

    // Remove the warning
    warns.splice(warnIndex, 1);
    saveWarnData(warns);

    // Create removal embed
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Warning Removed")
      .setColor(0x00ff00)
      .addFields(
        {
          name: "Removed Warning",
          value: `ID: \`${removedWarn.id}\``,
          inline: false,
        },
        { name: "Original User", value: removedWarn.username, inline: true },
        {
          name: "Originally Warned By",
          value: removedWarn.warnedBy,
          inline: true,
        },
        { name: "Removed By", value: interaction.user.username, inline: true },
        { name: "Original Reason", value: removedWarn.reason, inline: false },
        {
          name: "Original Date",
          value: `<t:${Math.floor(new Date(removedWarn.timestamp).getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Original Channel",
          value: `#${removedWarn.channelName}`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({
        text: "Warning has been permanently removed from the database",
      });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const ClearUserWarns: Command = {
  name: "clearuserwarns",
  description: "Clear all warnings for a specific user (Admin only)",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "The user to clear warnings for",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check if user has Administrator permission
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content:
          "❌ You must be a Discord Administrator to clear user warnings.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    let warns = loadWarnData();

    // Filter warnings for this user in this guild
    const userWarns = warns.filter(
      (warn) =>
        warn.userId === targetUser.id && warn.guildId === interaction.guildId,
    );

    if (userWarns.length === 0) {
      await interaction.reply({
        content: `📋 No warnings found for ${targetUser.username} in this server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Remove all warnings for this user in this guild
    warns = warns.filter(
      (warn) =>
        !(
          warn.userId === targetUser.id && warn.guildId === interaction.guildId
        ),
    );
    saveWarnData(warns);

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setTitle("🧹 User Warnings Cleared")
      .setColor(0x00ff00)
      .addFields(
        { name: "User", value: `${targetUser.username}`, inline: true },
        {
          name: "Warnings Removed",
          value: `${userWarns.length}`,
          inline: true,
        },
        { name: "Cleared By", value: interaction.user.username, inline: true },
      )
      .setTimestamp()
      .setFooter({
        text: "All warnings for this user have been permanently removed",
      });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const BulkRemoveWarns: Command = {
  name: "bulkremovewarns",
  description: "Remove multiple warnings by IDs (Admin only)",
  options: [
    {
      name: "ids",
      type: 3, // STRING
      description: "Warning IDs separated by spaces or commas",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check if user has Administrator permission
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content:
          "❌ You must be a Discord Administrator to bulk remove warnings.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const idsString = interaction.options.getString("ids", true);
    const warnIds = idsString
      .split(/[\s,]+/)
      .filter((id) => id.trim().length > 0);

    if (warnIds.length === 0) {
      await interaction.reply({
        content: "❌ Please provide at least one warning ID.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (warnIds.length > 20) {
      await interaction.reply({
        content: "❌ Maximum 20 warnings can be removed at once.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const warns = loadWarnData();
    const removedWarns: WarnData[] = [];
    const notFoundIds: string[] = [];

    // Find and collect warnings to remove
    warnIds.forEach((warnId) => {
      const warnIndex = warns.findIndex(
        (warn) => warn.id === warnId && warn.guildId === interaction.guildId,
      );

      if (warnIndex !== -1) {
        removedWarns.push(warns[warnIndex]);
      } else {
        notFoundIds.push(warnId);
      }
    });

    // Remove found warnings
    const updatedWarns = warns.filter(
      (warn) =>
        !warnIds.includes(warn.id) || warn.guildId !== interaction.guildId,
    );
    saveWarnData(updatedWarns);

    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Bulk Warning Removal")
      .setColor(removedWarns.length > 0 ? 0x00ff00 : 0xff0000)
      .addFields(
        {
          name: "Successfully Removed",
          value: `${removedWarns.length}`,
          inline: true,
        },
        { name: "Not Found", value: `${notFoundIds.length}`, inline: true },
        { name: "Removed By", value: interaction.user.username, inline: true },
      )
      .setTimestamp();

    if (removedWarns.length > 0) {
      const removedList = removedWarns
        .map((warn) => `• \`${warn.id}\` - ${warn.username}`)
        .join("\n");
      embed.addFields({
        name: "Removed Warnings",
        value:
          removedList.length > 1024
            ? removedList.substring(0, 1021) + "..."
            : removedList,
        inline: false,
      });
    }

    if (notFoundIds.length > 0) {
      const notFoundList = notFoundIds.map((id) => `• \`${id}\``).join("\n");
      embed.addFields({
        name: "Not Found IDs",
        value:
          notFoundList.length > 1024
            ? notFoundList.substring(0, 1021) + "..."
            : notFoundList,
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const WarnStats: Command = {
  name: "warnstats",
  description: "View warning statistics for the server",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    // Check permissions
    if (!canUserWarn(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to view warning statistics.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const warns = loadWarnData().filter(
      (warn) => warn.guildId === interaction.guildId,
    );

    if (warns.length === 0) {
      await interaction.reply({
        content: "📊 No warnings found in this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Calculate statistics
    const totalWarns = warns.length;
    const uniqueUsers = new Set(warns.map((warn) => warn.userId)).size;
    const uniqueWarners = new Set(warns.map((warn) => warn.warnedById)).size;

    // Most warned users
    const userCounts = warns.reduce(
      (acc, warn) => {
        acc[warn.userId] = (acc[warn.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const warn = warns.find((w) => w.userId === userId);
        return `• **${warn?.username || "Unknown"}**: ${count} warning${count > 1 ? "s" : ""}`;
      });

    // Most active warners
    const warnerCounts = warns.reduce(
      (acc, warn) => {
        acc[warn.warnedById] = (acc[warn.warnedById] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topWarners = Object.entries(warnerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([warnerId, count]) => {
        const warn = warns.find((w) => w.warnedById === warnerId);
        return `• **${warn?.warnedBy || "Unknown"}**: ${count} warning${count > 1 ? "s" : ""} issued`;
      });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentWarns = warns.filter(
      (warn) => new Date(warn.timestamp) > sevenDaysAgo,
    );

    const embed = new EmbedBuilder()
      .setTitle("📊 Warning Statistics")
      .setColor(0x0099ff)
      .addFields(
        { name: "📈 Total Warnings", value: `${totalWarns}`, inline: true },
        { name: "👥 Users Warned", value: `${uniqueUsers}`, inline: true },
        { name: "🛡️ Staff Members", value: `${uniqueWarners}`, inline: true },
        {
          name: "📅 Last 7 Days",
          value: `${recentWarns.length} warnings`,
          inline: true,
        },
        {
          name: "📊 Average per User",
          value: `${(totalWarns / uniqueUsers).toFixed(1)}`,
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: true },
      )
      .setTimestamp();

    if (topUsers.length > 0) {
      embed.addFields({
        name: "🥇 Most Warned Users",
        value: topUsers.join("\n"),
        inline: true,
      });
    }

    if (topWarners.length > 0) {
      embed.addFields({
        name: "🛡️ Most Active Staff",
        value: topWarners.join("\n"),
        inline: true,
      });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

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
