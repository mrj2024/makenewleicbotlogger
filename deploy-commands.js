require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const config = require("./src/config");
const { connect } = require("./src/db");
const { ensureIndexes } = require("./src/db/indexes");
const { registerInteractionHandler } = require("./src/handlers/interactions");

// Commands
const ping = require("./src/commands/ping");
const dbtest = require("./src/commands/dbtest");
const stafflog = require("./src/commands/stafflog");
const gamehistory = require("./src/commands/gamehistory");
const caseCmd = require("./src/commands/case");
const voidcase = require("./src/commands/voidcase");
const restorecase = require("./src/commands/restorecase");

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  await connect();
  await ensureIndexes();
});

async function router(interaction) {
  if (interaction.isChatInputCommand()) {
    switch (interaction.commandName) {
      case "ping":
        return ping.run(interaction);
      case "dbtest":
        return dbtest.run(interaction);
      case "stafflog":
        return stafflog.run(interaction);
      case "gamehistory":
        return gamehistory.run(interaction);
      case "case":
        return caseCmd.run(interaction);
      case "voidcase":
        return voidcase.run(interaction, client);
      case "restorecase":
        return restorecase.run(interaction, client);
      default:
        return;
    }
  }

  if (interaction.isStringSelectMenu()) {
    return stafflog.onSelect(interaction);
  }

  if (interaction.isModalSubmit()) {
    return stafflog.onModal(interaction, client);
  }

  if (interaction.isButton()) {
    return gamehistory.onButton(interaction);
  }
}

registerInteractionHandler(client, router);

client.login(config.discordToken);
