const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const config = require("../config");
const { getDb } = require("../db");
const { isStaff, isManagement, shield } = require("../utils/perms");
const { makeCaseId } = require("../utils/ids");
const { normalizeTarget, parseEvidence, clampEmbedField } = require("../utils/text");
const { resolveUser, getHeadshotUrl, getGroupRole } = require("../roblox");

const ACTIONS = [
  { label: "Warning", value: "WARN", emoji: "⚠️" },
  { label: "Kick", value: "KICK", emoji: "👢" },
  { label: "Ban", value: "BAN", emoji: "⛔" },
  { label: "Note", value: "NOTE", emoji: "📝" },
];

module.exports = {
  async run(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("stafflog_action_select")
      .setPlaceholder("Choose an action to log…")
      .addOptions(ACTIONS.map((a) => ({ label: a.label, value: a.value, emoji: a.emoji })));

    await interaction.reply({
      ephemeral: true,
      content: "Select the moderation action:",
      components: [new ActionRowBuilder().addComponents(select)],
    });
  },

  async onSelect(interaction) {
    if (interaction.customId !== "stafflog_action_select") return;
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    const action = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`stafflog_modal:${action}`)
      .setTitle(`Staff Log: ${action}`);

    const target = new TextInputBuilder()
      .setCustomId("target")
      .setLabel("Roblox username or userId")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(800);

    // Label must be <= 45 chars
    const evidence = new TextInputBuilder()
      .setCustomId("evidence")
      .setLabel("Evidence links (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(800);

    modal.addComponents(
      new ActionRowBuilder().addComponents(target),
      new ActionRowBuilder().addComponents(reason),
      new ActionRowBuilder().addComponents(evidence)
    );

    await interaction.showModal(modal);
  },

  async onModal(interaction, client) {
    if (!interaction.customId.startsWith("stafflog_modal:")) return;
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    const action = interaction.customId.split(":")[1];

    const targetInput = interaction.fields.getTextInputValue("target")?.trim();
    const reason = interaction.fields.getTextInputValue("reason")?.trim();
    const evidenceRaw = interaction.fields.getTextInputValue("evidence")?.trim();

    const evidence = parseEvidence(evidenceRaw);
    const caseId = makeCaseId();

    const staffType = isManagement(interaction.member) ? "MGMT" : "MOD";
    const staffShield = shield(interaction.member);

    // Roblox enrichment (never block logging if Roblox fails)
    let roblox = null;
    let headshotUrl = null;
    let groupRole = null;

    try {
      roblox = await resolveUser(targetInput);
      headshotUrl = await getHeadshotUrl(roblox.userId);

      if (config.roblox.groupId) {
        groupRole = await getGroupRole(roblox.userId, config.roblox.groupId);
      }
    } catch (e) {
      console.warn("Roblox enrichment failed:", e.message);
    }

    const targetKey = roblox ? String(roblox.userId) : normalizeTarget(targetInput);

    const db = getDb();
    const col = db.collection("modlogs");

    const doc = {
      caseId,
      action,
      target: {
        key: targetKey,
        input: targetInput,
        robloxUserId: roblox?.userId ?? null,
        robloxName: roblox?.name ?? null,
        robloxDisplayName: roblox?.displayName ?? null,
        groupRoleName: groupRole?.roleName ?? null,
        groupRank: groupRole?.rank ?? null,
        headshotUrl: headshotUrl ?? null,
      },
      reason,
      evidence,
      staff: {
        discordId: interaction.user.id,
        tag: interaction.user.tag,
        type: staffType,
      },
      status: "ACTIVE",
      createdAt: new Date(),
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      restoredAt: null,
      restoredBy: null,
      restoreReason: null,
    };

    await col.insertOne(doc);

    const robloxLine = roblox
      ? `**${roblox.displayName}** (@${roblox.name})\n\`UserId: ${roblox.userId}\``
      : `\`${targetInput}\``;

    const groupLine =
      groupRole ? `**${groupRole.roleName}** (Rank ${groupRole.rank})` : "_Not in group / unknown_";

    const embed = new EmbedBuilder()
      .setTitle(`${staffShield} Moderation Action Logged`)
      .addFields(
        { name: "Action", value: `\`${action}\``, inline: true },
        { name: "Case ID", value: `\`${caseId}\``, inline: true },
        { name: "Roblox User", value: clampEmbedField(robloxLine, 1024) },
        { name: "Group Role", value: clampEmbedField(groupLine, 1024), inline: true },
        { name: "Reason", value: clampEmbedField(reason, 1024) },
        {
          name: "Evidence",
          value: evidence.length
            ? clampEmbedField(evidence.map((l) => `• ${l}`).join("\n"), 1024)
            : "_None_",
        }
      )
      .setFooter({ text: `Logged by ${interaction.user.tag}` })
      .setTimestamp(new Date());

    embed.setColor(staffType === "MGMT" ? 0xd65bff : 0xededed);
    if (headshotUrl) embed.setThumbnail(headshotUrl);

    const ch = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });

    await interaction.reply({
      ephemeral: true,
      content: `✅ Logged **${action}** for \`${targetInput}\`.\nCase: \`${caseId}\``,
    });
  },
};
