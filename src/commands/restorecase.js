const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const { getDb } = require("../db");
const { isManagement, shield } = require("../utils/perms");

module.exports = {
  async run(interaction, client) {
    if (!isManagement(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Management only." });
      return;
    }

    const caseId = interaction.options.getString("caseid", true).trim();
    const reason = interaction.options.getString("reason", true).trim();

    const db = getDb();
    const col = db.collection("modlogs");

    const doc = await col.findOne({ caseId });
    if (!doc) {
      await interaction.reply({ ephemeral: true, content: `❌ Case not found: \`${caseId}\`` });
      return;
    }

    if (doc.status !== "VOID") {
      await interaction.reply({ ephemeral: true, content: `⚠️ Case \`${caseId}\` is not VOID.` });
      return;
    }

    await col.updateOne(
      { caseId },
      {
        $set: {
          status: "ACTIVE",
          restoredAt: new Date(),
          restoredBy: interaction.user.id,
          restoreReason: reason,
        },
      }
    );

    const s = shield(interaction.member);

    const embed = new EmbedBuilder()
      .setTitle(`${s} Case Restored`)
      .setDescription(`**Case:** \`${caseId}\`\n**Action:** \`${doc.action}\`\n**Target:** \`${doc.target?.input ?? "Unknown"}\``)
      .addFields({ name: "Restore reason", value: reason })
      .setFooter({ text: `Restored by ${interaction.user.tag}` })
      .setTimestamp(new Date())
      .setColor(0xededed);

    const ch = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });

    await interaction.reply({ ephemeral: true, content: `✅ Restored case \`${caseId}\`.` });
  },
};
