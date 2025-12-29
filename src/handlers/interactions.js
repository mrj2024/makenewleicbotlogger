const { MessageFlags } = require("discord.js");

function withEphemeral(payload) {
  return { ...payload, flags: MessageFlags.Ephemeral };
}

function safeReply(interaction, payload) {
  const finalPayload = payload.ephemeral ? withEphemeral(payload) : payload;
  delete finalPayload.ephemeral;

  const canReply = !interaction.replied && !interaction.deferred;
  return canReply ? interaction.reply(finalPayload) : interaction.followUp(finalPayload);
}

function registerInteractionHandler(client, router) {
  client.on("interactionCreate", async (interaction) => {
    try {
      await router(interaction);
    } catch (err) {
      console.error("Interaction error:", err);
      if (interaction.isRepliable()) {
        await safeReply(interaction, {
          ephemeral: true,
          content: "❌ Something went wrong. The error was logged.",
        }).catch(() => {});
      }
    }
  });
}

module.exports = { registerInteractionHandler, safeReply };
