module.exports = {
  async run(interaction) {
    await interaction.reply({ ephemeral: true, content: "Pong! 🏓" });
  },
};
