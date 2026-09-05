// @ts-check
/**
 * Authorization guard for destructive operations on a user account
 * (password reset, deactivate, role change).
 */

/**
 * @param {{ _id: unknown, role_id?: { permissions?: Record<string, boolean> } }} actor
 * @param {{ _id: unknown, role_id?: { permissions?: Record<string, boolean> } }} target
 * @returns {boolean}
 */
export function canActorManageTarget(actor, target) {
  if (!actor || !target) return false;
  if (String(actor._id) === String(target._id)) return false;

  const targetIsAdmin = target.role_id?.permissions?.adminConfig === true;
  const actorIsAdmin = actor.role_id?.permissions?.adminConfig === true;

  if (targetIsAdmin && !actorIsAdmin) return false;
  return true;
}

/**
 * Guard against role escalation: an actor may only assign a role that itself
 * carries `adminConfig` (create-with-admin-role or promote-to-admin-role) if
 * the actor already has `adminConfig`. This is separate from — and runs
 * BEFORE — canActorManageTarget, which only protects an already-admin
 * EXISTING target; it does nothing to stop a `gererUtilisateurs`-only actor
 * from creating a brand-new admin user or promoting a non-admin one, since
 * neither case has an existing admin-owned target to guard.
 * @param {{ role_id?: { permissions?: Record<string, boolean> } }} actor
 * @param {{ permissions?: Record<string, boolean> } | null | undefined} role
 *   The role document being assigned (already looked up by the caller).
 * @returns {boolean}
 */
export function canActorAssignRole(actor, role) {
  if (!role) return true; // Unknown/missing role — let normal validation reject it elsewhere.
  const roleIsAdmin = role.permissions?.adminConfig === true;
  if (!roleIsAdmin) return true;
  return actor?.role_id?.permissions?.adminConfig === true;
}
