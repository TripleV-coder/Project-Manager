// @ts-check
/**
 * Pure helpers describing a user account's transient state.
 */

/**
 * Whether the user must set a new password before getting a real session.
 * @param {{ must_change_password?: boolean, first_login?: boolean } | null | undefined} user
 * @returns {boolean}
 */
export function mustChangePassword(user) {
  if (!user) return false;
  return user.must_change_password === true || user.first_login === true;
}
