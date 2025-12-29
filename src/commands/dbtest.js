const { getDb } = require("../db");

module.exports = {
  async run(interaction) {
    const db = getDb();
    const col = db.collection("modlogs");

    const doc = {
      caseId: `TEST-${Date.now()}`,
      action: "WARN",
      target: {
        key: "someplayer",
        input: "SomePlayer",
        robloxUserId: null,
        robloxName: null,
        robloxDisplayName: null,
        groupRoleName: null,
        groupRank: null,
        headshotUrl: null,
      },
      reason: "Test insert",
      evidence: ["https://example.com"],
      staff: { discordId: interaction.user.id, tag: interaction.user.tag, type: "TEST" },
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

    const latest = await col
      .find({ "staff.discordId": interaction.user.id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    await interaction.reply({
      ephemeral: true,
      content: `✅ Inserted + read back:\n\`\`\`json\n${JSON.stringify(latest[0], null, 2)}\n\`\`\``,
    });
  },
};
