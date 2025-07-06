import { ChatInputCommandInteraction, Client, EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "../Command";
import * as fs from "fs";
import * as path from "path";
import config from "../config.json";

interface SubmissionData {
  index: number;
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  submission: string;
  themes: string[];
  approvedBy: string;
  approvedAt: string;
}

export const WwydStatus: Command = {
  name: "wwydstatus",
  description: "Check WWYD system status and statistics",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    try {
      // Check if approved submissions file exists
      const filePath = path.join(process.cwd(), "approved_submissions.json");
      let submissions: SubmissionData[] = [];
      let fileExists = false;

      if (fs.existsSync(filePath)) {
        fileExists = true;
        try {
          const data = fs.readFileSync(filePath, "utf8");
          submissions = JSON.parse(data);
        } catch (error) {
          console.error("Error reading submissions file:", error);
        }
      }

      // Count submissions by theme
      const themeCount: Record<string, number> = {};
      submissions.forEach(submission => {
        if (submission.themes && submission.themes.length > 0) {
          submission.themes.forEach(theme => {
            themeCount[theme] = (themeCount[theme] || 0) + 1;
          });
        }
      });

      // Sort themes by count
      const sortedThemes = Object.entries(themeCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10 themes

      const embed = new EmbedBuilder()
        .setTitle("🎯 WWYD System Status")
        .setColor(config.wwydSettings.enabled ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      // System status
      embed.addFields({
        name: "⚙️ System Status",
        value: `**Enabled:** ${config.wwydSettings.enabled ? "✅ Yes" : "❌ No"}
**Response Chance:** ${(config.wwydSettings.responseChance * 100).toFixed(1)}%
**Cooldown:** ${config.wwydSettings.cooldownSeconds}s
**Database File:** ${fileExists ? "✅ Found" : "❌ Missing"}`,
        inline: true,
      });

      // Statistics
      embed.addFields({
        name: "📊 Statistics",
        value: `**Total Submissions:** ${submissions.length}
**Ignored Channels:** ${config.ignoredChannels.length}
**Trigger Words:** ${config.wwydSettings.triggers.length}
**Fallback Themes:** ${config.wwydSettings.fallbackThemes.length}`,
        inline: true,
      });

      // Top themes
      if (sortedThemes.length > 0) {
        const themeList = sortedThemes
          .map(([theme, count]) => `**${theme}:** ${count}`)
          .join("\n");

        embed.addFields({
          name: "🏷️ Top Themes",
          value: themeList,
          inline: false,
        });
      }

      // Trigger words
      embed.addFields({
        name: "🔍 Trigger Words",
        value: config.wwydSettings.triggers.map(trigger => `\`${trigger}\``).join(", "),
        inline: false,
      });

      // Recent submissions (last 5)
      if (submissions.length > 0) {
        const recentSubmissions = submissions
          .sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime())
          .slice(0, 5);

        const recentList = recentSubmissions
          .map(sub => `**#${sub.index}** by ${sub.username} (${sub.themes?.join(", ") || "no themes"})`)
          .join("\n");

        embed.addFields({
          name: "📝 Recent Submissions",
          value: recentList,
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      console.error("Error in wwydstatus command:", error);
      await interaction.reply({
        content: "❌ Error checking WWYD status.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const WwydReset: Command = {
  name: "wwydreset",
  description: "Reset WWYD cooldowns (Admin only)",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    // Check if user has admin permissions
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content: "❌ You don't have permission to reset WWYD cooldowns.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // We can't directly access the cooldown maps from here, but we can restart the process
      // or provide information about how to reset

      await interaction.reply({
        content: "🔄 **WWYD Reset Information:**\n\n" +
                "To fully reset WWYD cooldowns, restart the bot.\n\n" +
                "**Current Settings:**\n" +
                `• User Cooldown: ${config.wwydSettings.cooldownSeconds}s\n` +
                `• Global Cooldown: 5s\n` +
                `• Response Chance: ${(config.wwydSettings.responseChance * 100).toFixed(1)}%\n` +
                `• System Enabled: ${config.wwydSettings.enabled ? "✅ Yes" : "❌ No"}`,
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      console.error("Error in wwydreset command:", error);
      await interaction.reply({
        content: "❌ Error resetting WWYD cooldowns.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const WwydTest: Command = {
  name: "wwydtest",
  description: "Test WWYD theme detection",
  options: [
    {
      name: "message",
      type: 3, // STRING
      description: "Message to test theme detection on",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const testMessage = interaction.options.getString("message", true);

    // Import the theme detection function (we'll need to export it from wwydHandler)
    // For now, we'll do a simple version here
    const THEME_KEYWORDS = {
      sigma: ["sigma", "alpha", "beta", "grindset", "gigachad", "chad", "based", "cringe", "ohio", "W", "L", "ratio", "mog"],
      brainrot: ["skibidi", "toilet", "gyatt", "gyat", "rizz", "rizzler", "fanum", "tax", "sus", "sussy", "copium", "hopium", "cope"],
      tiktok: ["tiktok", "fyp", "for you page", "viral", "trending", "algorithm", "reels", "stories", "influencer", "tiktoker"],
      school: ["school", "teacher", "homework", "class", "exam", "test", "grade", "student", "cafeteria", "locker", "hallway", "principal"],
      friendship: ["friend", "friendship", "bestie", "squad", "hang out", "sleepover", "group chat", "drama", "gossip", "tea", "spill", "beef"],
      family: ["mom", "dad", "parent", "sibling", "brother", "sister", "family", "home", "chores", "allowance", "grounded", "punishment"],
      romance: ["crush", "like", "dating", "boyfriend", "girlfriend", "valentine", "prom", "dance", "cute", "love", "relationship", "kiss", "hug"],
      gaming: ["game", "gaming", "console", "pc", "stream", "minecraft", "fortnite", "roblox", "discord", "valorant", "league of legends"],
      concerning: ["kms", "kill myself", "suicide", "self harm", "cutting", "hurt myself", "end it all", "want to die", "depression", "anxiety"],
      random: ["random", "weird", "strange", "chaos", "wild", "unexpected", "what", "why", "how", "confused", "help", "idk"],
    };

    function detectThemes(text: string): string[] {
      const lowerText = text.toLowerCase();
      const detectedThemes: string[] = [];

      for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
        if (keywords.some((keyword) => lowerText.includes(keyword))) {
          detectedThemes.push(theme);
        }
      }

      return detectedThemes.length > 0 ? detectedThemes : ["random"];
    }

    try {
      const detectedThemes = detectThemes(testMessage);

      // Check if it would trigger WWYD
      const wouldTrigger = config.wwydSettings.triggers.some(trigger =>
        testMessage.toLowerCase().includes(trigger.toLowerCase())
      );

      const embed = new EmbedBuilder()
        .setTitle("🧪 WWYD Theme Detection Test")
        .setColor(0x0099ff)
        .setTimestamp();

      embed.addFields({
        name: "📝 Test Message",
        value: `\`\`\`${testMessage}\`\`\``,
        inline: false,
      });

      embed.addFields({
        name: "🎯 Detected Themes",
        value: detectedThemes.map(theme => `\`${theme}\``).join(", "),
        inline: false,
      });

      embed.addFields({
        name: "⚡ Would Trigger WWYD",
        value: wouldTrigger ? "✅ Yes" : "❌ No",
        inline: true,
      });

      embed.addFields({
        name: "🎲 Response Chance",
        value: `${(config.wwydSettings.responseChance * 100).toFixed(1)}%`,
        inline: true,
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      console.error("Error in wwydtest command:", error);
      await interaction.reply({
        content: "❌ Error testing WWYD theme detection.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
