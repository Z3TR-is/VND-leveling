const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot response time"),

  new SlashCommandBuilder()
    .setName("xp_leaderboard")
    .setDescription("Show the XP leaderboard")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log("✅ Slash commands registered successfully.");
  } catch (error) {
    console.error("❌ Error registering slash commands:", error);
  }
})();