import Project from '@/models/Project';
import { ALL_MENUS } from '@/lib/permissions';

const toId = (value) => {
  if (!value) return '';
  return String(value._id || value);
};

/**
 * Menus sidebar = rôle système AND (lead sur un projet OU union des rôles projet).
 * Un chef garde sa navigation système. Un membre ne voit que les menus
 * autorisés à la fois par son rôle système et par au moins un rôle projet.
 */
export async function resolveSidebarMenus(user) {
  const systemMenus = user?.role_id?.visibleMenus || user?.role?.visibleMenus || {};
  const perms = user?.role_id?.permissions || user?.role?.permissions || {};

  if (perms.adminConfig === true) {
    return { ...systemMenus };
  }

  const userId = toId(user?._id);
  if (!userId) return { ...systemMenus };

  const projects = await Project.find({
    archivé: { $ne: true },
    $or: [
      { chef_projet: user._id },
      { product_owner: user._id },
      { créé_par: user._id },
      { 'membres.user_id': user._id },
    ],
  })
    .select('chef_projet product_owner créé_par membres.user_id membres.project_role_id')
    .populate('membres.project_role_id', 'visibleMenus')
    .lean();

  const isLead = projects.some(
    (project) =>
      toId(project.chef_projet) === userId ||
      toId(project.product_owner) === userId ||
      toId(project.créé_par) === userId
  );

  if (isLead || projects.length === 0) {
    return { ...systemMenus };
  }

  const roleMenus = [];
  for (const project of projects) {
    for (const member of project.membres || []) {
      if (toId(member.user_id) !== userId) continue;
      if (member.project_role_id?.visibleMenus) {
        roleMenus.push(member.project_role_id.visibleMenus);
      }
    }
  }

  if (roleMenus.length === 0) {
    return { ...systemMenus };
  }

  const resolved = {};
  for (const menu of ALL_MENUS) {
    resolved[menu] = systemMenus[menu] === true && roleMenus.some((menus) => menus[menu] === true);
  }
  return resolved;
}

export async function serializeUserWithProjectMenus(user, serialize) {
  const payload = serialize(user);
  const visibleMenus = await resolveSidebarMenus(user);
  if (payload.role) payload.role.visibleMenus = visibleMenus;
  if (payload.role_id) payload.role_id.visibleMenus = visibleMenus;
  return payload;
}
