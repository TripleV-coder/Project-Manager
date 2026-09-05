/**
 * Helpers isomorphes (client + serveur) pour le roster d'un projet.
 * Une tâche / un sprint ne se commandent que vers des gens déjà sur le projet.
 */

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const id = value._id || value.id || value;
  if (!id) return '';
  return typeof id === 'string' ? id : String(id);
};

const toUserStub = (user) => {
  if (!user || typeof user !== 'object') return null;
  const id = toId(user);
  if (!id || id === '[object Object]') return null;
  return {
    _id: user._id || id,
    nom_complet: user.nom_complet || user.email || 'Membre',
    email: user.email || '',
    avatar: user.avatar || null,
  };
};

export function collectProjectRosterIds(project) {
  if (!project) return [];
  const ids = new Set();
  const add = (value) => {
    const id = toId(value);
    if (id && id !== '[object Object]') ids.add(id);
  };

  add(project.chef_projet);
  add(project.product_owner);
  add(project.créé_par);
  project.membres?.forEach((member) => add(member.user_id || member));
  return [...ids];
}

export function isOnProjectRoster(project, userId) {
  return collectProjectRosterIds(project).includes(toId(userId));
}

export function extractAssignableUsers(project) {
  if (!project) return [];
  const byId = new Map();
  const add = (user) => {
    const stub = toUserStub(user);
    if (stub) byId.set(toId(stub), stub);
  };

  add(project.chef_projet);
  add(project.product_owner);
  add(project.créé_par);
  project.membres?.forEach((member) => add(member.user_id));
  return [...byId.values()];
}

export function isSameUser(left, right) {
  const a = toId(left);
  const b = toId(right);
  return Boolean(a) && a === b;
}
