import {
  ChatInputCommandInteraction,
  Client,
  TextChannel,
  MessageFlags,
  DMChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
} from "discord.js";
import { Command } from "../Command";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config";

const ADMIN_CHANNEL_ID = "1391277749695549583";
const APPROVED_ROLE_ID = config.approvedSubmissionRoleId;

// Theme keywords for tagging (TikTok/brainrot humor)
const THEME_KEYWORDS = {
  sigma: [
    "sigma",
    "alpha",
    "beta",
    "grindset",
    "gigachad",
    "chad",
    "based",
    "cringe",
    "sigma male",
    "alpha male",
    "ohio",
    "W",
    "L",
    "ratio",
    "mog",
    "mogged",
  ],
  brainrot: [
    "skibidi",
    "toilet",
    "gyatt",
    "gyat",
    "rizz",
    "rizzler",
    "fanum",
    "tax",
    "sus",
    "sussy",
    "baka",
    "amogus",
    "among us",
    "impostor",
    "vent",
    "drip",
    "sheesh",
    "bussin",
    "no cap",
    "cap",
    "bet",
    "periodt",
    "slay",
    "ate",
    "left no crumbs",
    "skull emoji",
    "crying laughing",
    "fr fr",
    "nah bro",
    "bro what",
    "lowkey",
    "highkey",
    "mid",
    "fire",
    "slaps",
    "hits different",
    "vibe check",
    "main character",
    "side character",
    "npc",
    "touch grass",
    "go outside",
    "chronically online",
    "terminally online",
    "grass",
    "maidenless",
    "copium",
    "hopium",
    "cope",
    "seethe",
    "mald",
    "malding",
    "bozo",
    "clown",
    "skill issue",
    "get good",
    "ez",
    "diff",
    "built different",
    "caught in 4k",
    "4k",
    "ratio + L",
  ],
  tiktok: [
    "tiktok",
    "fyp",
    "for you page",
    "viral",
    "trending",
    "algorithm",
    "reels",
    "stories",
    "live",
    "stream",
    "content creator",
    "influencer",
    "tiktoker",
    "social media",
    "hashtag",
    "viral dance",
    "trend",
    "challenge",
    "duet",
    "stitch",
    "comment",
    "like",
    "share",
    "follow",
    "followers",
    "mutuals",
  ],
  school: [
    "school",
    "teacher",
    "homework",
    "class",
    "exam",
    "test",
    "grade",
    "student",
    "cafeteria",
    "locker",
    "hallway",
    "principal",
    "detention",
    "suspension",
    "tardy",
    "absent",
    "present",
    "attendance",
    "assembly",
    "pep rally",
    "graduation",
    "yearbook",
    "senior",
    "junior",
    "sophomore",
    "freshman",
  ],
  friendship: [
    "friend",
    "friendship",
    "bestie",
    "squad",
    "hang out",
    "sleepover",
    "group chat",
    "drama",
    "gossip",
    "tea",
    "spill",
    "beef",
    "fake friend",
    "real friend",
    "loyalty",
    "betrayal",
    "trust",
    "secrets",
    "bff",
    "day one",
    "ride or die",
  ],
  family: [
    "mom",
    "dad",
    "parent",
    "sibling",
    "brother",
    "sister",
    "family",
    "home",
    "chores",
    "allowance",
    "grounded",
    "punishment",
    "rules",
    "curfew",
    "family dinner",
    "thanksgiving",
    "christmas",
    "birthday",
    "holiday",
    "vacation",
    "relatives",
    "cousin",
    "aunt",
    "uncle",
  ],
  romance: [
    "crush",
    "like",
    "dating",
    "boyfriend",
    "girlfriend",
    "valentine",
    "prom",
    "dance",
    "cute",
    "love",
    "relationship",
    "single",
    "taken",
    "talking",
    "situationship",
    "heartbreak",
    "breakup",
    "ex",
    "jealous",
    "flirting",
    "asking out",
    "rejection",
  ],
  gaming: [
    "game",
    "gaming",
    "console",
    "pc",
    "stream",
    "youtube",
    "minecraft",
    "fortnite",
    "roblox",
    "discord",
    "valorant",
    "league of legends",
    "among us",
    "gta",
    "cod",
    "call of duty",
    "apex",
    "overwatch",
    "fifa",
    "2k",
    "madden",
    "pokemon",
    "nintendo",
    "xbox",
    "playstation",
    "switch",
  ],
  concerning: [
    "kms",
    "kill myself",
    "suicide",
    "self harm",
    "cutting",
    "hurt myself",
    "end it all",
    "not worth it",
    "nobody cares",
    "hate myself",
    "want to die",
    "depression",
    "anxiety",
    "panic attack",
    "mental health",
    "therapy",
    "counselor",
    "help",
    "crisis",
    "emergency",
  ],
  random: [
    "random",
    "weird",
    "strange",
    "chaos",
    "wild",
    "unexpected",
    "bruh moment",
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "huh",
    "confused",
    "lost",
    "help",
    "idk",
    "idc",
    "whatever",
    "ok",
    "fine",
    "sure",
    "maybe",
    "probably",
    "definitely",
    "absolutely",
    "totally",
    "literally",
    "actually",
    "basically",
    "honestly",
    "seriously",
    "obviously",
    "clearly",
  ],
};

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

function getNextIndex(): number {
  const dbPath = path.join(process.cwd(), "approved_submissions.json");
  let database: SubmissionData[] = [];

  try {
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, "utf8");
      if (fileContent.trim().length > 0) {
        database = JSON.parse(fileContent);
      }
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }

  // Return the next index (highest index + 1, or 1 if no submissions)
  const maxIndex =
    database.length > 0 ? Math.max(...database.map((s) => s.index)) : 0;
  return maxIndex + 1;
}

function saveToDatabase(submissionData: SubmissionData) {
  const dbPath = path.join(process.cwd(), "approved_submissions.json");
  let database: SubmissionData[] = [];

  try {
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, "utf8");
      if (fileContent.trim().length > 0) {
        database = JSON.parse(fileContent);
      }
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }

  database.push(submissionData);

  try {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    console.log("✅ Submission saved to database");
  } catch (error) {
    console.error("❌ Error writing to database:", error);
  }
}

export const Submit: Command = {
  name: "submit",
  description: "Send a private submission for admin review",
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
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

      // Forward to admin channel with approval buttons
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      if (adminChannel && adminChannel.isTextBased()) {
        const nextIndex = getNextIndex();

        const approveButton = new ButtonBuilder()
          .setCustomId(`approve_${interaction.user.id}_${Date.now()}`)
          .setLabel("✅ Approve")
          .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
          .setCustomId(`reject_${interaction.user.id}_${Date.now()}`)
          .setLabel("❌ Reject")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          approveButton,
          rejectButton,
        );

        const themes = detectThemes(submission);
        const themeText =
          themes.length > 0
            ? `\n🏷️ **Detected themes:** ${themes.join(", ")}`
            : "";

        const message = await (adminChannel as TextChannel).send({
          content: `📨 **New submission from <@${interaction.user.id}> (Will be index #${nextIndex}):**\n\`\`\`${submission}\`\`\`${themeText}`,
          components: [row],
        });

        // Handle button interactions
        const filter = (i: any) =>
          i.isButton() &&
          (i.customId.startsWith("approve_") ||
            i.customId.startsWith("reject_"));

        const collector = message.createMessageComponentCollector({
          filter,
          time: 24 * 60 * 60 * 1000, // 24 hours
        });

        collector.on("collect", async (i: ButtonInteraction) => {
          if (!i.memberPermissions?.has("Administrator")) {
            await i.reply({
              content: "❌ You don't have permission to review submissions.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const isApproved = i.customId.startsWith("approve_");

          if (isApproved) {
            // Save to database with theme tags and index
            const dbData: SubmissionData = {
              index: nextIndex,
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              userId: interaction.user.id,
              username: interaction.user.username,
              submission: submission,
              themes: themes,
              approvedBy: i.user.id,
              approvedAt: new Date().toISOString(),
            };

            saveToDatabase(dbData);

            // Add role to user if they're in the guild
            try {
              const guild = i.guild as Guild;
              console.log(`🔍 Role assignment debug:`);
              console.log(`   Guild: ${guild ? guild.name : "null"}`);
              console.log(`   Role ID: ${APPROVED_ROLE_ID}`);
              console.log(`   User ID: ${interaction.user.id}`);

              if (
                guild &&
                APPROVED_ROLE_ID &&
                APPROVED_ROLE_ID !== "YOUR_ROLE_ID_HERE"
              ) {
                const member = await guild.members.fetch(interaction.user.id);
                if (member) {
                  const role = guild.roles.cache.get(APPROVED_ROLE_ID);
                  if (role) {
                    await member.roles.add(APPROVED_ROLE_ID);
                    console.log(
                      `✅ Added approved role "${role.name}" to ${interaction.user.tag}`,
                    );
                  } else {
                    console.error(
                      `❌ Role with ID ${APPROVED_ROLE_ID} not found in guild`,
                    );
                  }
                } else {
                  console.error(
                    `❌ Member ${interaction.user.tag} not found in guild`,
                  );
                }
              } else {
                console.log(
                  `⚠️ Role assignment skipped: Guild=${!!guild}, RoleID=${APPROVED_ROLE_ID}, Valid=${APPROVED_ROLE_ID !== "YOUR_ROLE_ID_HERE"}`,
                );
              }
            } catch (error) {
              console.error("❌ Error adding role to user:", error);
            }

            await i.update({
              content: `✅ **APPROVED** by <@${i.user.id}>\n\n📨 **Submission #${nextIndex} from <@${interaction.user.id}>:**\n\`\`\`${submission}\`\`\`\n🏷️ **Themes:** ${themes.join(", ")}`,
              components: [],
            });

            // Notify the user
            try {
              await interaction.user.send(
                `🎉 Your submission has been approved and added to the database as #${nextIndex}!`,
              );
            } catch (error) {
              console.error("Could not DM user about approval:", error);
            }
          } else {
            await i.update({
              content: `❌ **REJECTED** by <@${i.user.id}>\n\n📨 **Submission from <@${interaction.user.id}>:**\n\`\`\`${submission}\`\`\`\n🏷️ **Themes:** ${themes.join(", ")}`,
              components: [],
            });

            // Notify the user
            try {
              await interaction.user.send(
                "😔 Your submission was not approved. Feel free to try again with a different response!",
              );
            } catch (error) {
              console.error("Could not DM user about rejection:", error);
            }
          }
        });

        collector.on("end", () => {
          // Disable buttons after timeout
          message
            .edit({
              components: [],
            })
            .catch(console.error);
        });
      }

      console.log("✅ Submission forwarded to admin channel");
    } catch (error: any) {
      console.error("❌ Error during submission:", error);

      if (error.code === "time") {
        await interaction.followUp({
          content: "⏰ You didn't respond in time. Please try again.",
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

export const FindApproved: Command = {
  name: "findapproved",
  description: "Find approved submissions by username (optional)",
  options: [
    {
      name: "username",
      type: 3, // STRING
      description: "Username to search for (leave empty to show all)",
      required: false,
    },
    {
      name: "page",
      type: 4, // INTEGER
      description: "Page number (shows 5 submissions per page)",
      required: false,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const username = interaction.options.getString("username");
    const page = interaction.options.getInteger("page") || 1;
    const filePath = path.join(process.cwd(), "approved_submissions.json");

    try {
      if (!fs.existsSync(filePath)) {
        await interaction.reply({
          content: "❌ No approved submissions found.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = fs.readFileSync(filePath, "utf8");
      const submissions: SubmissionData[] = JSON.parse(data);

      let filteredSubmissions: SubmissionData[];
      let titleText: string;

      if (username) {
        // Filter by username if provided
        filteredSubmissions = submissions.filter(
          (s) => s.username.toLowerCase() === username.toLowerCase(),
        );
        titleText = `📋 Approved Submissions for ${username}`;

        if (filteredSubmissions.length === 0) {
          await interaction.reply({
            content: `❌ No approved submissions found for **${username}**.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      } else {
        // Show all submissions if no username provided
        filteredSubmissions = submissions;
        titleText = "📋 All Approved Submissions";

        if (filteredSubmissions.length === 0) {
          await interaction.reply({
            content: "❌ No approved submissions found.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      // Sort by index
      filteredSubmissions.sort((a, b) => a.index - b.index);

      // Pagination
      const itemsPerPage = 5;
      const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageSubmissions = filteredSubmissions.slice(startIndex, endIndex);

      if (pageSubmissions.length === 0) {
        await interaction.reply({
          content: `❌ Page ${page} is empty. There are only ${totalPages} pages.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${titleText} (Page ${page}/${totalPages})`)
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({
          text: `Total submissions: ${filteredSubmissions.length}`,
        });

      pageSubmissions.forEach((submission, i) => {
        const themes = submission.themes?.join(", ") || "none";
        const content =
          submission.submission.length > 100
            ? submission.submission.substring(0, 100) + "..."
            : submission.submission;

        embed.addFields({
          name: `#${submission.index} - ${submission.username}`,
          value: `**Content:** ${content}\n**Themes:** ${themes}\n**Approved:** <t:${Math.floor(new Date(submission.approvedAt).getTime() / 1000)}:R>`,
          inline: false,
        });
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("❌ Error finding submissions:", error);
      await interaction.reply({
        content: "❌ Error reading submissions file.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const RemoveSubmission: Command = {
  name: "removesubmission",
  description: "Remove a submission by index number",
  options: [
    {
      name: "index",
      type: 4, // INTEGER
      description: "The index number of the submission to remove",
      required: true,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const index = interaction.options.getInteger("index", true);
    const filePath = path.join(process.cwd(), "approved_submissions.json");

    try {
      if (!fs.existsSync(filePath)) {
        await interaction.reply({
          content: "❌ No approved submissions found.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = fs.readFileSync(filePath, "utf8");
      let submissions: SubmissionData[] = JSON.parse(data);

      const submissionToRemove = submissions.find((s) => s.index === index);

      if (!submissionToRemove) {
        await interaction.reply({
          content: `❌ No submission found with index #${index}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Remove the submission
      submissions = submissions.filter((s) => s.index !== index);

      // Write back updated list
      fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));

      await interaction.reply({
        content: `🗑️ **Removed submission #${index}:**\n\`\`\`${submissionToRemove.submission}\`\`\`\n**By:** ${submissionToRemove.username}\n**Themes:** ${submissionToRemove.themes?.join(", ") || "none"}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("❌ Error removing submission:", error);
      await interaction.reply({
        content: "❌ Error processing the removal.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export const ListSubmissions: Command = {
  name: "listsubmissions",
  description: "List all approved submissions with their index numbers",
  options: [
    {
      name: "page",
      type: 4, // INTEGER
      description: "Page number (shows 5 submissions per page)",
      required: false,
    },
  ],
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const page = interaction.options.getInteger("page") || 1;
    const filePath = path.join(process.cwd(), "approved_submissions.json");

    try {
      if (!fs.existsSync(filePath)) {
        await interaction.reply({
          content: "❌ No approved submissions found.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = fs.readFileSync(filePath, "utf8");
      const submissions: SubmissionData[] = JSON.parse(data);

      if (submissions.length === 0) {
        await interaction.reply({
          content: "❌ No approved submissions found.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Sort by index
      submissions.sort((a, b) => a.index - b.index);

      const itemsPerPage = 5;
      const totalPages = Math.ceil(submissions.length / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageSubmissions = submissions.slice(startIndex, endIndex);

      if (pageSubmissions.length === 0) {
        await interaction.reply({
          content: `❌ Page ${page} is empty. There are only ${totalPages} pages.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Approved Submissions (Page ${page}/${totalPages})`)
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({
          text: `Total submissions: ${submissions.length}`,
        });

      pageSubmissions.forEach((submission) => {
        const themes = submission.themes?.join(", ") || "none";
        const content =
          submission.submission.length > 100
            ? submission.submission.substring(0, 100) + "..."
            : submission.submission;

        embed.addFields({
          name: `#${submission.index} - ${submission.username}`,
          value: `**Content:** ${content}\n**Themes:** ${themes}`,
          inline: false,
        });
      });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("❌ Error listing submissions:", error);
      await interaction.reply({
        content: "❌ Error reading submissions file.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
