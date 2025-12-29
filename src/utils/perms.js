const config = require("../config");

function hasRole(member, roleId) {
  return Boolean(roleId) && member?.roles?.cache?.has(roleId);
}

function isStaff(member) {
  return hasRole(member, config.roles.mod) || hasRole(member, config.roles.mgmt);
}

function isManagement(member) {
  return hasRole(member, config.roles.mgmt);
}

function shield(member) {
  if (isManagement(member)) return config.shields.mgmt;
  if (hasRole(member, config.roles.mod)) return config.shields.mod;
  return "👤";
}

module.exports = { hasRole, isStaff, isManagement, shield };
