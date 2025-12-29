function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  guildId: required("GUILD_ID"),

  mongoUri: required("MONGODB_URI"),
  mongoDbName: process.env.MONGODB_DB || "roblox_modlogs",

  logChannelId: required("LOG_CHANNEL_ID"),

  roles: {
    mod: required("MOD_ROLE_ID"),
    mgmt: required("MGMT_ROLE_ID"),
  },

  shields: {
    mod: process.env.MOD_SHIELD || "🛡️",
    mgmt: process.env.MGMT_SHIELD || "🛡️",
  },

  roblox: {
    groupId: process.env.ROBLOX_GROUP_ID ? Number(process.env.ROBLOX_GROUP_ID) : null,
    cacheTtlSeconds: Number(process.env.ROBLOX_CACHE_TTL_SECONDS || 1800),
  },
};
