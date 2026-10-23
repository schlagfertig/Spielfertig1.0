const RANK = { owner: 4, manager: 3, editor: 2, viewer: 1 };

const ROLE_OPTIONS = [
  { id: "viewer", label: "nur lesen" },
  { id: "editor", label: "bearbeiten" },
  { id: "manager", label: "verwalten" },
];

function roleLabel(role) {
  if (role === "owner") return "besitzer";
  const hit = ROLE_OPTIONS.find(r => r.id === role);
  return hit ? hit.label : "";
}

function capsFor(band, user, members) {
  const none = { role: "none", editSongs: false, deleteSongs: false, manage: false, leave: false };
  if (!band || !user) return none;
  let role = "none";
  if (band.user_id != null && user.id != null && String(band.user_id) === String(user.id)) role = "owner";
  else {
    const mine = (members || []).find(m => String(m.band_id) === String(band.id) && String(m.user_id) === String(user.id));
    if (mine && RANK[mine.role]) role = mine.role;
  }
  const rank = RANK[role] || 0;
  return {
    role,
    editSongs: rank >= 2,
    deleteSongs: rank >= 3,
    manage: rank >= 3,
    leave: rank >= 1 && role !== "owner",
  };
}

export { ROLE_OPTIONS, roleLabel, capsFor };
