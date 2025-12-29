const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getDb } = require("../db");
const config = require("../config");
const { isStaff, isManagement, shield } = require("../utils/perms");
const { clampEmbedField, normalizeTarget } = require("../utils/text");
const { resolveUser, getHeadshotUrl, getGroupRole } = require("../roblox");
const state = require("../state");

function token() {
  // short token for customId
  return Math.random().toString(36).slice(2, 10);
}

function formatRow(doc) {
  const statusTag = doc.status === "VOID" ? " **(VOID)**" : "";
  const who = doc.staff?.tag ?? "Unknown";
  return `• \`${doc.caseId}\`  \`${doc.action}\`${statusTag}  by **${who}**`;
}

async function resolveRobloxHeader(targetInput) {
  let roblox = null;
  let headshotUrl = null;
  let groupRole = null;

  try {
    roblox = await resolveUser(targetInput);
    headshotUrl = await getHeadshotUrl(roblox.userId);
    if (config.roblox.groupId) {
      groupRole = await getGroupRole(roblox.userId, config.roblox.groupId);
    }
  } catch {
    // keep going without enrichment
  }

  return { roblox, headshotUrl, groupRole };
}

function buildKeyQuery({ targetInput, roblox }) {
  const keyLegacy = normalizeTarget(targetInput);
  if (roblox?.userId) {
    const keyPreferred = String(roblox.userId);
    return { $or: [{ "target.key": keyPreferred }, { "target.key": keyLegacy }] };
  }
  return { "target.key": keyLegacy };
}

module.exports = {
  async run(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    const targetInput = interaction.options.getString("target", true).trim();
    const pageSize = Math.min(Math.max(interaction.options.getInteger("limit") ?? 5, 1), 20);
    const includeVoidedRequested = interaction.options.getBoolean("include_voided") ?? false;
    const includeVoided = includeVoidedRequested && isManagement(interaction.member);

    // Enrich header (cached, fast)
    const header = await resolveRobloxHeader(targetInput);

    const db = getDb();
    const col = db.collection("modlogs");

    const keyQuery = buildKeyQuery({ targetInput, roblox: header.roblox });
    const query = includeVoided ? keyQuery : { $and: [keyQuery, { status: "ACTIVE" }] };

    const total = await col.countDocuments(query);
    const page = 0;

    const docs = await col
      .find(query)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    const embed = this.buildEmbed({
      requester: interaction.user,
      requesterMember: interaction.member,
      targetInput,
      includeVoided,
      page,
      pageSize,
      total,
      docs,
      header,
    });

    // Store paging state server-side and use short tokens in customId
    const t = token();
    state.put(t, { targetInput, includeVoided, page, pageSize });

    const components = this.buildButtons({ token: t, page, pageSize, total });

    await interaction.reply({ ephemeral: true, embeds: [embed], components });
  },

  buildEmbed({ requester, requesterMember, targetInput, includeVoided, page, pageSize, total, docs, header }) {
    const s = shield(requesterMember);
    const lines = docs.length ? docs.map(formatRow).join("\n") : "_No records found._";
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    const { roblox, headshotUrl, groupRole } = header;

    const who = roblox
      ? `**${roblox.displayName}** (@${roblox.name})\n\`UserId: ${roblox.userId}\``
      : `\`${targetInput}\``;

    const groupLine =
      groupRole ? `**${groupRole.roleName}** (Rank ${groupRole.rank})` : "_Not in group / unknown_";

    const embed = new EmbedBuilder()
      .setTitle(`${s} Game History`)
      .setDescription(
        `**Target:** ${who}\n` +
          `**Group Role:** ${groupLine}\n` +
          `**Showing:** ${includeVoided ? "ACTIVE + VOID" : "ACTIVE only"}\n` +
          `**Page:** ${page + 1}/${pageCount}  |  **Total:** ${total}\n\n` +
          clampEmbedField(lines, 4096)
      )
      .setFooter({ text: `Requested by ${requester.tag}` })
      .setTimestamp(new Date());

    embed.setColor(includeVoided ? 0xd65bff : 0xededed);
    if (headshotUrl) embed.setThumbnail(headshotUrl);
    return embed;
  },

  buildButtons({ token, page, pageSize, total }) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const prevDisabled = page <= 0;
    const nextDisabled = page >= pageCount - 1;

    // customId MUST be <= 100 chars. These are tiny.
    const prev = new ButtonBuilder()
      .setCustomId(`gh:prev:${token}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(prevDisabled);

    const next = new ButtonBuilder()
      .setCustomId(`gh:next:${token}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(nextDisabled);

    return [new ActionRowBuilder().addComponents(prev, next)];
  },

  async onButton(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({ ephemeral: true, content: "⛔ Staff only." });
      return;
    }

    // Expected format: gh:prev:TOKEN or gh:next:TOKEN
    const parts = interaction.customId.split(":");
    if (parts.length !== 3 || parts[0] !== "gh") return;

    const dir = parts[1];
    const tok = parts[2];

    const saved = state.get(tok);
    if (!saved) {
      await interaction.reply({
        ephemeral: true,
        content: "⚠️ Those buttons expired. Please run `/gamehistory` again.",
      });
      return;
    }

    // Non-management cannot keep includeVoided true
    const includeVoided = saved.includeVoided && isManagement(interaction.member);

    const { targetInput, pageSize } = saved;

    const header = await resolveRobloxHeader(targetInput);

    const db = getDb();
    const col = db.collection("modlogs");

    const keyQuery = buildKeyQuery({ targetInput, roblox: header.roblox });
    const query = includeVoided ? keyQuery : { $and: [keyQuery, { status: "ACTIVE" }] };

    const total = await col.countDocuments(query);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    let page = saved.page ?? 0;
    if (dir === "prev") page = Math.max(0, page - 1);
    if (dir === "next") page = Math.min(pageCount - 1, page + 1);

    const docs = await col
      .find(query)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    // Update saved state, refresh TTL
    state.put(tok, { targetInput, includeVoided, page, pageSize });

    const embed = this.buildEmbed({
      requester: interaction.user,
      requesterMember: interaction.member,
      targetInput,
      includeVoided,
      page,
      pageSize,
      total,
      docs,
      header,
    });

    const components = this.buildButtons({ token: tok, page, pageSize, total });

    await interaction.update({ embeds: [embed], components });
  },
};
