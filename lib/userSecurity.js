import { randomInt } from 'crypto';
import { hashPassword } from '@/lib/auth';
import { disconnectUserSockets } from '@/lib/socket-emitter';
import emailService from '@/lib/services/emailService';
import User from '@/models/User';
import UserSession from '@/models/UserSession';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SPECIAL = '!@#$%^&*_-+=';
const ALL = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SPECIAL}`;

function randomIndex(max) {
  return randomInt(max);
}

function shuffle(value) {
  const chars = value.split('');

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
}

export function generateTemporaryPassword(length = 14) {
  const targetLength = Math.max(length, 12);

  let password = '';
  password += UPPERCASE[randomIndex(UPPERCASE.length)];
  password += LOWERCASE[randomIndex(LOWERCASE.length)];
  password += NUMBERS[randomIndex(NUMBERS.length)];
  password += SPECIAL[randomIndex(SPECIAL.length)];

  while (password.length < targetLength) {
    password += ALL[randomIndex(ALL.length)];
  }

  return shuffle(password);
}

export async function assignTemporaryPassword(user, options = {}) {
  const { firstLogin = true, mustChangePassword = true } = options;

  const tempPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(tempPassword);

  user.password = hashedPassword;
  user.first_login = firstLogin;
  user.must_change_password = mustChangePassword;
  user.password_history = [
    { hash: hashedPassword, date: new Date() },
    ...(user.password_history || []).slice(0, 4),
  ];

  return tempPassword;
}

export async function sendTemporaryPasswordEmail(user, tempPassword) {
  try {
    await emailService.sendEmail({
      to: user.email,
      subject: 'Votre mot de passe temporaire - PM Gestion',
      html: `
        <h2>Bienvenue sur PM Gestion</h2>
        <p>Bonjour ${user.nom_complet},</p>
        <p>Votre compte a été créé. Voici votre mot de passe temporaire :</p>
        <p style="font-size: 18px; font-weight: bold; background: #f3f4f6; padding: 12px; border-radius: 6px;">${tempPassword}</p>
        <p>Vous devrez le changer lors de votre première connexion.</p>
        <p>Cordialement,<br>L'équipe PM Gestion</p>
      `,
    });
  } catch (error) {
    // Email failure should not block user creation
    console.error('Failed to send temporary password email:', error);
  }
}

export async function revokeUserSessions(userId, reason = 'sessions_revoked') {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );

  await UserSession.updateMany(
    { utilisateur: userId, statut: 'actif' },
    {
      $set: {
        statut: 'révoqué',
        logout_time: new Date(),
        updated_at: new Date(),
        metadata: { reason },
      },
    }
  );

  disconnectUserSockets(userId, reason);

  return updatedUser;
}
