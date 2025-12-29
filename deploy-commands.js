require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check if the bot is alive"),

  new SlashCommandBuilder().setName("dbtest").setDescription("Test MongoDB insert/read"),

  new SlashCommandBuilder().setName("stafflog").setDescription("Log a moderation action"),

  new SlashCommandBuilder()
    .setName("gamehistory")
    .setDescription("View a player's moderation history")
    .addStringOption((o) =>
      o.setName("target").setDescription("Roblox username or userId").setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName("limit")
        .setDescription("How many records to show (default 5)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    )
    .addBooleanOption((o) =>
      o
        .setName("include_voided")
        .setDescription("Include voided records (management only recommended)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("case")
    .setDescription("View a single moderation case")
    .addStringOption((o) => o.setName("caseid").setDescription("Case ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("voidcase")
    .setDescription("Void a moderation case (management)")
    .addStringOption((o) => o.setName("caseid").setDescription("Case ID").setRequired(true))
    .addStringOption((o) =>
      o.setName("reason").setDescription("Why is this being voided?").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("restorecase")
    .setDescription("Restore a voided moderation case (management)")
    .addStringOption((o) => o.setName("caseid").setDescription("Case ID").setRequired(true))
    .addStringOption((o) =>
      o.setName("reason").setDescription("Why is this being restored?").setRequired(true)
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.CLIENT_ID) throw new Error("Missing CLIENT_ID");
    if (!process.env.GUILD_ID) throw new Error("Missing GUILD_ID");

    console.log("🏠 Registering GUILD commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Guild commands registered.");
  } catch (err) {
    console.error(err);
  }
})();
