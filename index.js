const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Events, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// =====================
// DATA PATH
// =====================
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "data")
  : path.join(__dirname, "data");

const LEVELS_FILE = path.join(DATA_DIR, "levels.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LEVELS_FILE)) fs.writeFileSync(LEVELS_FILE, JSON.stringify({}, null, 2));

function loadLevels() {
  try { return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8")); } 
  catch { return {}; }
}

function saveLevels(data) {
  try { fs.writeFileSync(LEVELS_FILE, JSON.stringify(data, null, 2)); } 
  catch (err) { console.error(err); }
}

function getXPNeeded(level) { return level * 100; }

// =====================
// ROLE REWARDS
// =====================
const roleRewards = {
  1: "1486624511427346472",
  10: "1486624590481588434",
  20: "1486624679811612792",
  30: "1486624772833153026",
  50: "1486625010645991505",
  70: "1486625237570424936"
};

// =====================
// LEVEL-UP CHANNEL
// =====================
const LEVEL_UP_CHANNEL_ID = '1408661076350079056';

// =====================
// REGISTER SLASH COMMANDS (simplified)
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("عرض اللوحة تاع المتصدرين")
  ].map(cmd => cmd.toJSON());

  try {
    const rest = new REST({ version: "10" }).setToken(config.token);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Error registering slash commands:", err);
  }
});

// =====================
// INTERACTION HANDLER
// =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const levels = loadLevels();
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  if (!levels[guildId]) levels[guildId] = {};
  if (!levels[guildId][userId]) levels[guildId][userId] = { xp: 0, level: 1 };

  if (interaction.commandName === "leaderboard") {
    const guildUsers = levels[guildId];
    const sorted = Object.entries(guildUsers)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    if (!sorted.length) return interaction.reply("لا توجد بيانات بعد في الـ leaderboard.");

    let text = "🏆 **لوحة المتصدرين**\n\n";
    for (let i = 0; i < sorted.length; i++) {
      const [id, data] = sorted[i];
      text += `**${i + 1}.** <@${id}> — المستوى **${data.level}** (**${data.xp} XP**)\n`;
    }
    return interaction.reply(text);
  }
});

// =====================
// LEVELING SYSTEM (no cooldown)
// =====================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const levels = loadLevels();

  if (!levels[guildId]) levels[guildId] = {};
  if (!levels[guildId][userId]) levels[guildId][userId] = { xp: 0, level: 1 };

  const xpGain = Math.floor(Math.random() * 16) + 15;
  levels[guildId][userId].xp += xpGain;

  let userData = levels[guildId][userId];
  let leveledUp = false;

  while (userData.xp >= getXPNeeded(userData.level)) {
    userData.xp -= getXPNeeded(userData.level);
    userData.level += 1;
    leveledUp = true;
  }

  saveLevels(levels);

  if (leveledUp) {
    const channel = message.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID) || message.channel;
    let messageText = `${message.author} لقد تقدمت إلى المستوى **${userData.level}**!`;

    if (roleRewards[userData.level]) {
      const role = message.guild.roles.cache.get(roleRewards[userData.level]);
      if (role && !message.member.roles.cache.has(role.id)) {
        try {
          await message.member.roles.add(role);
          messageText += ` لقد حصلت على رول: **${role.name}**`;
        } catch (err) { console.error(err); }
      }
    }

    channel.send(messageText);
  }
});

client.login(process.env.BOT_TOKEN);
