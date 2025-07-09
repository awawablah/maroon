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

interface BanKickConfig {
  allowedRoles: string[];
}

const WARN_DATA_FILE = path.join(process.cwd(), "warn_data.json");
const WARN_CONFIG_FILE = path.join(process.cwd(), "warn_config.json");
const BANKICK_CONFIG_FILE = path.join(process.cwd(), "bankick_config.json");

// Initialize files if they don't exist
function initializeFiles(): void {
  if (!fs.existsSync(WARN_DATA_FILE)) {
    fs.writeFileSync(WARN_DATA_FILE, "[]");
  }
  if (!fs.existsSync(WARN_CONFIG_FILE)) {
    const defaultConfig: WarnConfig = { allowedRoles: [] };
    fs.writeFileSync(WARN_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
  if (!fs.existsSync(BANKICK_CONFIG_FILE)) {
    const defaultConfig: BanKickConfig = { allowedRoles: [] };
    fs.writeFileSync(
      BANKICK_CONFIG_FILE,
      JSON.stringify(defaultConfig, null, 2),
    );
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

function loadBanKickConfig(): BanKickConfig {
  try {
    const data = fs.readFileSync(BANKICK_CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading ban/kick config:", error);
    return { allowedRoles: [] };
  }
}

function saveBanKickConfig(config: BanKickConfig): void {
  try {
    fs.writeFileSync(BANKICK_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving ban/kick config:", error);
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

function canUserBanKick(interaction: ChatInputCommandInteraction): boolean {
  // Check if user has Administrator permission
  if (interaction.memberPermissions?.has("Administrator")) {
    return true;
  }

  // Check if user has any of the allowed roles
  const config = loadBanKickConfig();
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

    // Log the moderation action
    logModerationAction(
      "warn",
      targetUser.id,
      targetUser.username,
      interaction.user.id,
      interaction.user.username,
      reason,
      channel.id,
      channel.name,
      interaction.guildId!,
    );

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
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),

        new ButtonBuilder()
          .setCustomId("warn_next")
          .setLabel("▶️")
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

export function handleModifyBanKickCommand(message: Message): boolean {
  // Check if message starts with ..!modifybankick
  if (!message.content.startsWith("..!modifybankick")) {
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

  // Parse the command: ..!modifybankick <@role> -> enable/disable
  const content = message.content.substring(16).trim(); // Remove "..!modifybankick "

  // Check if content is empty
  if (!content) {
    message.reply(
      "❌ Missing arguments. Use: `..!modifybankick <@role> -> enable/disable`\n\n**Examples:**\n• `..!modifybankick @Moderator -> enable`\n• `..!modifybankick @Helper -> disable`",
    );
    return true;
  }

  // Match pattern: <@&roleId> -> action or <@roleId> -> action
  const roleMatch = content.match(/^<@&?(\d+)>\s*->\s*(enable|disable)$/i);

  if (!roleMatch) {
    message.reply(
      "❌ Invalid syntax. Use: `..!modifybankick <@role> -> enable/disable`\n\n**Examples:**\n• `..!modifybankick @Moderator -> enable`\n• `..!modifybankick @Helper -> disable`\n\n**Make sure to:**\n• Mention the role with @\n• Use the exact syntax with spaces around `->`\n• Use either `enable` or `disable`",
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
    message.reply("❌ Cannot modify ban/kick permissions for @everyone role.");
    return true;
  }

  const config = loadBanKickConfig();

  try {
    if (action === "enable") {
      if (!config.allowedRoles.includes(role.id)) {
        config.allowedRoles.push(role.id);
        saveBanKickConfig(config);
        message.reply(
          `✅ Enabled ban/kick permissions for role **${role.name}**.`,
        );
      } else {
        message.reply(
          `⚠️ Role **${role.name}** already has ban/kick permissions.`,
        );
      }
    } else if (action === "disable") {
      const index = config.allowedRoles.indexOf(role.id);
      if (index > -1) {
        config.allowedRoles.splice(index, 1);
        saveBanKickConfig(config);
        message.reply(
          `✅ Disabled ban/kick permissions for role **${role.name}**.`,
        );
      } else {
        message.reply(
          `⚠️ Role **${role.name}** doesn't have ban/kick permissions.`,
        );
      }
    }
  } catch (error) {
    console.error("Error modifying ban/kick permissions:", error);
    message.reply(
      "❌ An error occurred while modifying ban/kick permissions. Please try again.",
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

export const WarnLeaderboard: Command = {
  name: "warnleaderboard",
  description: "View public warning leaderboard for the server",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeFiles();

    const warns = loadWarnData().filter(
      (warn) => warn.guildId === interaction.guildId,
    );

    if (warns.length === 0) {
      await interaction.reply({
        content:
          "📊 **Warning Leaderboard** 📊\n\n✅ No warnings found in this server - everyone's being good! 🎉",
      });
      return;
    }

    // Calculate statistics
    const totalWarns = warns.length;
    const uniqueUsers = new Set(warns.map((warn) => warn.userId)).size;

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
      .slice(0, 10)
      .map(([userId, count], index) => {
        const warn = warns.find((w) => w.userId === userId);
        const medal =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📍";
        return `${medal} **${warn?.username || "Unknown"}** - ${count} warning${count > 1 ? "s" : ""}`;
      });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentWarns = warns.filter(
      (warn) => new Date(warn.timestamp) > sevenDaysAgo,
    );

    let message = "📊 **SERVER WARNING LEADERBOARD** 📊\n\n";
    message += `📈 **Total Warnings:** ${totalWarns}\n`;
    message += `👥 **Users Warned:** ${uniqueUsers}\n`;
    message += `📅 **Last 7 Days:** ${recentWarns.length} warnings\n`;
    message += `📊 **Average per User:** ${(totalWarns / uniqueUsers).toFixed(1)}\n\n`;

    message += "🏆 **TOP WARNED USERS** 🏆\n";
    message += topUsers.join("\n");

    message += "\n\n💡 *Use `/warnlist @user` to see specific warnings*";

    await interaction.reply({
      content: message,
    });
  },
};

export const Ban: Command = {
  name: "ban",
  description: "Ban a user from the server",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "The user to ban",
      required: true,
    },
    {
      name: "reason",
      type: 3, // STRING
      description: "The reason for the ban",
      required: true,
    },
    {
      name: "deletedays",
      type: 4, // INTEGER
      description: "Days of messages to delete (0-7)",
      required: false,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    // Check permissions
    if (!canUserBanKick(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to use the ban command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const deleteDays = interaction.options.getInteger("deletedays") || 0;

    // Validate delete days
    if (deleteDays < 0 || deleteDays > 7) {
      await interaction.reply({
        content: "❌ Delete days must be between 0 and 7.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Prevent banning bots
    if (targetUser.bot) {
      await interaction.reply({
        content: "❌ You cannot ban bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Prevent self-banning
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot ban yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if user is in guild
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // Try to get member to check permissions
      const targetMember = await guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      const executorMember = await guild.members.fetch(interaction.user.id);

      if (targetMember) {
        // Check if target has higher role
        if (
          targetMember.roles.highest.position >=
          executorMember.roles.highest.position
        ) {
          await interaction.reply({
            content:
              "❌ You cannot ban someone with equal or higher role permissions.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Check if target is an administrator
        if (targetMember.permissions.has("Administrator")) {
          await interaction.reply({
            content: "❌ You cannot ban an administrator.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      // Send DM before banning
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔨 You Have Been Banned")
          .setColor(0xff0000)
          .addFields(
            {
              name: "Banned by",
              value: interaction.user.username,
              inline: true,
            },
            { name: "Server", value: guild.name, inline: true },
            { name: "Reason", value: reason, inline: false },
            {
              name: "Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: false,
            },
          )
          .setTimestamp()
          .setFooter({
            text: "You can appeal this ban by contacting the server moderators.",
          });

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Could not send DM to banned user:", error);
      }

      // Ban the user
      await guild.members.ban(targetUser, {
        reason: `${reason} | Banned by: ${interaction.user.username}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      });

      // Log the moderation action
      logModerationAction(
        "ban",
        targetUser.id,
        targetUser.username,
        interaction.user.id,
        interaction.user.username,
        reason,
        interaction.channelId!,
        (interaction.channel as TextChannel).name,
        guild.id,
        { deleteDays },
      );

      // Create public embed
      const publicEmbed = new EmbedBuilder()
        .setTitle("🔨 User Banned")
        .setColor(0xff0000)
        .addFields(
          { name: "User", value: `<@${targetUser.id}>`, inline: true },
          {
            name: "Banned by",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false },
          {
            name: "Time",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
          {
            name: "Messages Deleted",
            value: `${deleteDays} day${deleteDays !== 1 ? "s" : ""}`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [publicEmbed],
      });
    } catch (error) {
      console.error("Error banning user:", error);
      await interaction.reply({
        content:
          "❌ Failed to ban user. They may have already left the server or I don't have permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const Kick: Command = {
  name: "kick",
  description: "Kick a user from the server",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "The user to kick",
      required: true,
    },
    {
      name: "reason",
      type: 3, // STRING
      description: "The reason for the kick",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    // Check permissions
    if (!canUserBanKick(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to use the kick command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    // Prevent kicking bots
    if (targetUser.bot) {
      await interaction.reply({
        content: "❌ You cannot kick bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Prevent self-kicking
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot kick yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if user is in guild
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // Try to get member
      const targetMember = await guild.members.fetch(targetUser.id);
      const executorMember = await guild.members.fetch(interaction.user.id);

      if (!targetMember) {
        await interaction.reply({
          content: "❌ User is not in this server.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if target has higher role
      if (
        targetMember.roles.highest.position >=
        executorMember.roles.highest.position
      ) {
        await interaction.reply({
          content:
            "❌ You cannot kick someone with equal or higher role permissions.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if target is an administrator
      if (targetMember.permissions.has("Administrator")) {
        await interaction.reply({
          content: "❌ You cannot kick an administrator.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Send DM before kicking
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("👢 You Have Been Kicked")
          .setColor(0xff9900)
          .addFields(
            {
              name: "Kicked by",
              value: interaction.user.username,
              inline: true,
            },
            { name: "Server", value: guild.name, inline: true },
            { name: "Reason", value: reason, inline: false },
            {
              name: "Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: false,
            },
          )
          .setTimestamp()
          .setFooter({
            text: "You can rejoin the server if you have an invite link.",
          });

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Could not send DM to kicked user:", error);
      }

      // Kick the user
      await targetMember.kick(
        `${reason} | Kicked by: ${interaction.user.username}`,
      );

      // Log the moderation action
      logModerationAction(
        "kick",
        targetUser.id,
        targetUser.username,
        interaction.user.id,
        interaction.user.username,
        reason,
        interaction.channelId!,
        (interaction.channel as TextChannel).name,
        guild.id,
      );

      // Create public embed
      const publicEmbed = new EmbedBuilder()
        .setTitle("👢 User Kicked")
        .setColor(0xff9900)
        .addFields(
          { name: "User", value: `<@${targetUser.id}>`, inline: true },
          {
            name: "Kicked by",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false },
          {
            name: "Time",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [publicEmbed],
      });
    } catch (error) {
      console.error("Error kicking user:", error);
      await interaction.reply({
        content:
          "❌ Failed to kick user. They may have already left the server or I don't have permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

interface ModerationLogEntry {
  id: string;
  type: "warn" | "ban" | "kick";
  userId: string;
  username: string;
  moderatorId: string;
  moderatorUsername: string;
  reason: string;
  timestamp: string;
  channelId: string;
  channelName: string;
  guildId: string;
  additionalInfo?: any;
}

const MOD_LOG_FILE = path.join(process.cwd(), "moderation_log.json");

function initializeModLog(): void {
  if (!fs.existsSync(MOD_LOG_FILE)) {
    fs.writeFileSync(MOD_LOG_FILE, "[]");
  }
}

function loadModLog(): ModerationLogEntry[] {
  try {
    const data = fs.readFileSync(MOD_LOG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading moderation log:", error);
    return [];
  }
}

function saveModLog(data: ModerationLogEntry[]): void {
  try {
    fs.writeFileSync(MOD_LOG_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving moderation log:", error);
  }
}

function logModerationAction(
  type: "warn" | "ban" | "kick",
  userId: string,
  username: string,
  moderatorId: string,
  moderatorUsername: string,
  reason: string,
  channelId: string,
  channelName: string,
  guildId: string,
  additionalInfo?: any,
): void {
  initializeModLog();

  const entry: ModerationLogEntry = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    type,
    userId,
    username,
    moderatorId,
    moderatorUsername,
    reason,
    timestamp: new Date().toISOString(),
    channelId,
    channelName,
    guildId,
    additionalInfo,
  };

  const log = loadModLog();
  log.push(entry);
  saveModLog(log);
}

export const ModerationLog: Command = {
  name: "modlog",
  description: "View moderation action log with pagination",
  options: [
    {
      name: "user",
      type: 6, // USER
      description: "Filter log for a specific user",
      required: false,
    },
    {
      name: "type",
      type: 3, // STRING
      description: "Filter by action type",
      required: false,
      choices: [
        { name: "Warnings", value: "warn" },
        { name: "Bans", value: "ban" },
        { name: "Kicks", value: "kick" },
      ],
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    initializeModLog();

    // Check permissions
    if (!canUserWarn(interaction)) {
      await interaction.reply({
        content: "❌ You don't have permission to view the moderation log.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user");
    const actionType = interaction.options.getString("type") as
      | "warn"
      | "ban"
      | "kick"
      | null;
    let logEntries = loadModLog();

    // Filter by guild
    logEntries = logEntries.filter(
      (entry) => entry.guildId === interaction.guildId,
    );

    // Filter by user if specified
    if (targetUser) {
      logEntries = logEntries.filter((entry) => entry.userId === targetUser.id);
    }

    // Filter by type if specified
    if (actionType) {
      logEntries = logEntries.filter((entry) => entry.type === actionType);
    }

    // Sort by timestamp (newest first)
    logEntries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (logEntries.length === 0) {
      let message = "No moderation actions found";
      if (targetUser) message += ` for ${targetUser.username}`;
      if (actionType) message += ` of type ${actionType}`;
      message += " in this server.";

      await interaction.reply({
        content: `📋 ${message}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(logEntries.length / itemsPerPage);
    let currentPage = 1;

    const generateEmbed = (page: number) => {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageEntries = logEntries.slice(startIndex, endIndex);

      let title = "📋 Moderation Log";
      if (targetUser) title += ` for ${targetUser.username}`;
      if (actionType) title += ` (${actionType}s)`;
      title += ` (Page ${page}/${totalPages})`;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `Total entries: ${logEntries.length}` });

      pageEntries.forEach((entry, index) => {
        const entryDate = new Date(entry.timestamp);
        const timeString = `<t:${Math.floor(entryDate.getTime() / 1000)}:R>`;

        const typeEmoji =
          entry.type === "warn" ? "⚠️" : entry.type === "ban" ? "🔨" : "👢";
        const actionName =
          entry.type.charAt(0).toUpperCase() + entry.type.slice(1);

        let description = `**${actionName}:** ${entry.username}\n`;
        description += `**Moderator:** ${entry.moderatorUsername}\n`;
        description += `**Reason:** ${entry.reason}\n`;
        description += `**Channel:** #${entry.channelName}\n`;
        description += `**Time:** ${timeString}`;

        if (
          entry.additionalInfo &&
          entry.type === "ban" &&
          entry.additionalInfo.deleteDays
        ) {
          description += `\n**Messages Deleted:** ${entry.additionalInfo.deleteDays} day(s)`;
        }

        embed.addFields({
          name: `${typeEmoji} ${startIndex + index + 1}. ${actionName} Action`,
          value: description,
          inline: false,
        });
      });

      return embed;
    };

    const generateButtons = (page: number) => {
      const row = new ActionRowBuilder<ButtonBuilder>();

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("modlog_prev")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),

        new ButtonBuilder()
          .setCustomId("modlog_next")
          .setLabel("▶️")
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

        if (buttonInteraction.customId === "modlog_prev" && currentPage > 1) {
          currentPage--;
        } else if (
          buttonInteraction.customId === "modlog_next" &&
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

export const BanKickPermissions: Command = {
  name: "bankickpermissions",
  description: "View current ban/kick role permissions (Admin only)",
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

    const config = loadBanKickConfig();

    if (config.allowedRoles.length === 0) {
      await interaction.reply({
        content:
          "📋 **Current Ban/Kick Permissions:**\n\n❌ No roles have ban/kick permissions.\n\n*Only Discord Administrators can use ban/kick commands.*",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔨 Ban/Kick Permissions")
      .setColor(0xff0000)
      .setDescription("The following roles can use ban and kick commands:")
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
        "Discord Administrators can always use ban/kick commands regardless of role permissions.",
      inline: false,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
