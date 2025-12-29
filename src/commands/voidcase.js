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

    if (doc.status === "VOID") {
      await interaction.reply({ ephemeral: true, content: `⚠️ Case \`${caseId}\` is already VOID.` });
      return;
    }

    await col.updateOne(
      { caseId },
      {
        $set: {
          status: "VOID",
          voidedAt: new Date(),
          voidedBy: interaction.user.id,
          voidReason: reason,
        },
      }
    );

    const s = shield(interaction.member);

    const embed = new EmbedBuilder()
      .setTitle(`${s} Case Voided`)
      .setDescription(`**Case:** \`${caseId}\`\n**Action:** \`${doc.action}\`\n**Target:** \`${doc.target?.input ?? "Unknown"}\``)
      .addFields({ name: "Void reason", value: reason })
      .setFooter({ text: `Voided by ${interaction.user.tag}` })
      .setTimestamp(new Date())
      .setColor(0xd65bff);

    const ch = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });

    await interaction.reply({ ephemeral: true, content: `✅ Voided case \`${caseId}\`.` });
  },
};
