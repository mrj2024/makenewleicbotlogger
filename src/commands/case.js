const { EmbedBuilder } = require("discord.js");
const { getDb } = require("../db");
const { isStaff } = require("../utils/perms");
const { clampEmbedField } = require("../utils/text");

module.exports = {
  async run(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    const caseId = interaction.options.getString("caseid", true).trim();
    const db = getDb();
    const col = db.collection("modlogs");

    const doc = await col.findOne({ caseId });

    if (!doc) {
      await interaction.reply({ ephemeral: true, content: `❌ Case not found: \`${caseId}\`` });
      return;
    }

    const t = doc.target || {};
    const robloxLine =
      t.robloxUserId && t.robloxName
        ? `**${t.robloxDisplayName ?? t.robloxName}** (@${t.robloxName})\n\`UserId: ${t.robloxUserId}\``
        : `\`${t.input ?? "Unknown"}\``;

    const groupLine =
      t.groupRoleName && typeof t.groupRank === "number"
        ? `**${t.groupRoleName}** (Rank ${t.groupRank})`
        : "_Not in group / unknown_";

    const statusLine =
      doc.status === "VOID"
        ? `**Status:** VOID\n**Voided by:** <@${doc.voidedBy ?? "0"}>\n**Void reason:** ${doc.voidReason ?? "_None_"}`
        : "**Status:** ACTIVE";

    const embed = new EmbedBuilder()
      .setTitle(`Case ${doc.caseId}`)
      .setDescription(
        `**Action:** \`${doc.action}\`\n` +
          `**Roblox User:** ${robloxLine}\n` +
          `**Group Role:** ${groupLine}\n` +
          `${statusLine}`
      )
      .addFields(
        { name: "Reason", value: clampEmbedField(doc.reason, 1024) },
        {
          name: "Evidence",
          value: doc.evidence?.length
            ? clampEmbedField(doc.evidence.map((l) => `• ${l}`).join("\n"), 1024)
            : "_None_",
        },
        { name: "Logged by", value: `${doc.staff?.tag ?? "Unknown"} (${doc.staff?.discordId ?? "?"})` }
      )
      .setTimestamp(doc.createdAt ?? new Date());

    embed.setColor(doc.status === "VOID" ? 0xd65bff : 0xededed);
    if (t.headshotUrl) embed.setThumbnail(t.headshotUrl);

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  },
};
