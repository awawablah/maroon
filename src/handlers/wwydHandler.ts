import { Message, Client } from "discord.js";
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

// Theme keywords for detecting themes in user messages
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
    "grandma",
    "grandpa",
    "grandmother",
    "grandfather",
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
    "kiss",
    "hug",
    "date",
    "married",
    "wedding",
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
    "twitch",
    "streamer",
    "gamer",
    "noob",
    "pro",
    "lag",
    "fps",
    "ping",
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
    "die",
    "death",
    "dead",
    "kill",
    "murder",
    "violence",
    "hurt",
    "pain",
    "suffering",
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

// Cooldown tracking
const userCooldowns = new Map<string, number>();

// Global cooldown to prevent rapid firing
let lastGlobalResponse = 0;
const GLOBAL_COOLDOWN_MS = 5000; // 5 seconds between any responses

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

function loadApprovedSubmissions(): SubmissionData[] {
  const filePath = path.join(process.cwd(), "approved_submissions.json");

  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading approved submissions:", error);
    return [];
  }
}

function findMatchingSubmissions(themes: string[]): SubmissionData[] {
  const submissions = loadApprovedSubmissions();

  // Find submissions that match any of the detected themes
  const matchingSubmissions = submissions.filter((submission) => {
    if (!submission.themes || submission.themes.length === 0) {
      return false;
    }

    // Check if any theme matches
    return themes.some((theme) =>
      submission.themes.some(
        (submissionTheme) =>
          submissionTheme.toLowerCase() === theme.toLowerCase(),
      ),
    );
  });

  return matchingSubmissions;
}

function getRandomSubmission(
  submissions: SubmissionData[],
): SubmissionData | null {
  if (submissions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * submissions.length);
  return submissions[randomIndex];
}

function isWwydMessage(content: string): boolean {
  const lowerContent = content.toLowerCase();

  return config.wwydSettings.triggers.some((trigger) =>
    lowerContent.includes(trigger.toLowerCase()),
  );
}

function isOnCooldown(userId: string): boolean {
  const now = Date.now();

  // Check global cooldown
  if (now - lastGlobalResponse < GLOBAL_COOLDOWN_MS) {
    console.log(
      `🕐 Global cooldown active (${Math.ceil((GLOBAL_COOLDOWN_MS - (now - lastGlobalResponse)) / 1000)}s remaining)`,
    );
    return true;
  }

  // Check user cooldown
  const lastUsed = userCooldowns.get(userId) || 0;
  const cooldownMs = config.wwydSettings.cooldownSeconds * 1000;

  if (now - lastUsed < cooldownMs) {
    console.log(
      `🕐 User cooldown active for ${userId} (${Math.ceil((cooldownMs - (now - lastUsed)) / 1000)}s remaining)`,
    );
    return true;
  }

  return false;
}

function setCooldown(userId: string): void {
  const now = Date.now();
  userCooldowns.set(userId, now);
  lastGlobalResponse = now;
  console.log(`✅ Cooldown set for user ${userId}`);
  
}

export async function handleWwydMessage(
  message: Message,
  client: Client,
): Promise<void> {
  try {
    // Skip if not enabled
    if (!config.wwydSettings.enabled) {
      console.log("🚫 WWYD handler disabled");
      return;
    }

    // Skip if bot message
    if (message.author.bot) {
      return;
    }

    // Skip if in ignored channel
    if (config.ignoredChannels.includes(message.channel.id)) {
      console.log(`🚫 Ignored channel: ${message.channel.id}`);
      return;
    }

    // Skip if not a WWYD message
    if (!isWwydMessage(message.content)) {
      return;
    }

    console.log(
      `🎯 WWYD trigger detected from ${message.author.username}: "${message.content}"`,
    );

    // Skip if user is on cooldown
    if (isOnCooldown(message.author.id)) {
      return;
    }

    // Detect themes in the user's message
    const detectedThemes = detectThemes(message.content);
    console.log(`🎯 Detected themes for "${message.content}":`, detectedThemes);

    // Find matching submissions
    let matchingSubmissions = findMatchingSubmissions(detectedThemes);
    console.log(
      `📊 Found ${matchingSubmissions.length} matching submissions for themes: ${detectedThemes.join(", ")}`,
    );

    // If no matches found, try fallback themes
    if (matchingSubmissions.length === 0) {
      console.log("⚠️ No matches found, trying fallback themes...");
      matchingSubmissions = findMatchingSubmissions(
        config.wwydSettings.fallbackThemes,
      );
      console.log(
        `📊 Found ${matchingSubmissions.length} fallback submissions`,
      );
    }

    // If still no matches, get any random submission
    if (matchingSubmissions.length === 0) {
      console.log("⚠️ No fallback matches, getting any random submission...");
      const allSubmissions = loadApprovedSubmissions();
      console.log(`📊 Total submissions in database: ${allSubmissions.length}`);
      if (allSubmissions.length > 0) {
        matchingSubmissions = [
          allSubmissions[Math.floor(Math.random() * allSubmissions.length)],
        ];
      }
    }

    // Get random submission from matches
    const randomSubmission = getRandomSubmission(matchingSubmissions);

    if (!randomSubmission) {
      console.log("❌ No submissions found in database");
      return;
    }

    // Set cooldown BEFORE responding
    setCooldown(message.author.id);

    // Reply with the submission
    const response = randomSubmission.submission;
    const themes = randomSubmission.themes?.join(", ") || "none";

    console.log(
      `✅ Responding with submission #${randomSubmission.index} (themes: ${themes})`,
    );

    // Add random emojis with 50% chance
    const emojiChance = 0.5;
    let finalResponse = response;

    if (Math.random() < emojiChance) {
      const emojis = ["💀", "🔥", "😭"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      finalResponse = `${response} ${randomEmoji}`;
    }

    await message.reply(finalResponse);
    console.log(`🎉 Successfully responded to ${message.author.username}`);
  } catch (error) {
    console.error("❌ Error handling WWYD message:", error);

    // Reset cooldowns on error to prevent permanent lockout
    if (message && message.author) {
      userCooldowns.delete(message.author.id);
      console.log(`🔄 Reset cooldown for ${message.author.id} due to error`);
    }
  }
}
