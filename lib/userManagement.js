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
