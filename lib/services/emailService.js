/**
 * Email Service
 * Service d'envoi d'emails pour les notifications
 * Utilise Nodemailer avec support SMTP configurable
 */

import nodemailer from 'nodemailer';

// Configuration par défaut
const defaultConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Créer le transporteur
let transporter = null;

/**
 * Initialiser le transporteur email
 */
export const initEmailTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[WARNING] Email service: SMTP credentials not configured');
    return null;
  }

  try {
    transporter = nodemailer.createTransport(defaultConfig);
    console.log('[OK] Email transporter initialized');
    return transporter;
  } catch (error) {
    console.error('✗ Failed to initialize email transporter:', error);
    return null;
  }
};

/**
 * Vérifier si le service email est configuré
 */
export const isEmailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};

/**
 * Envoyer un email
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} options.text - Contenu texte
 * @param {string} options.html - Contenu HTML (optionnel)
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    transporter = initEmailTransporter();
  }

  if (!transporter) {
    console.warn('Email not sent: SMTP not configured');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"PM Gestion" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text
    });

    console.log('[OK] Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Templates d'emails prédéfinis
 */
export const emailTemplates = {
  // Notification de nouvelle tâche assignée
  taskAssigned: (task, assignee, project) => ({
    subject: `[PM] Nouvelle tâche assignée: ${task.titre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
          .task-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .priority-haute { color: #f97316; }
          .priority-critique { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">PM - Gestion de Projets</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${assignee.nom_complet},</h2>
            <p>Une nouvelle tâche vous a été assignée :</p>

            <div class="task-info">
              <h3 style="margin-top: 0;">${task.titre}</h3>
              <p><strong>Projet:</strong> ${project?.nom || 'Non spécifié'}</p>
              <p><strong>Priorité:</strong> <span class="priority-${task.priorité?.toLowerCase()}">${task.priorité}</span></p>
              ${task.date_échéance ? `<p><strong>Échéance:</strong> ${new Date(task.date_échéance).toLocaleDateString('fr-FR')}</p>` : ''}
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            </div>

            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tasks" class="btn">
                Voir la tâche
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par PM - Gestion de Projets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bonjour ${assignee.nom_complet},

Une nouvelle tâche vous a été assignée :

Titre: ${task.titre}
Projet: ${project?.nom || 'Non spécifié'}
Priorité: ${task.priorité}
${task.date_échéance ? `Échéance: ${new Date(task.date_échéance).toLocaleDateString('fr-FR')}` : ''}
${task.description ? `Description: ${task.description}` : ''}

Voir la tâche: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tasks

--
PM - Gestion de Projets
    `
  }),

  // Notification de commentaire
  newComment: (comment, task, author, recipient) => ({
    subject: `[PM] Nouveau commentaire sur: ${task.titre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
          .comment-box { background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">PM - Gestion de Projets</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${recipient.nom_complet},</h2>
            <p><strong>${author.nom_complet}</strong> a ajouté un commentaire sur la tâche <strong>${task.titre}</strong>:</p>

            <div class="comment-box">
              <p style="margin: 0;">${comment.contenu}</p>
              <small style="color: #6b7280;">${new Date(comment.created_at).toLocaleString('fr-FR')}</small>
            </div>

            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/comments" class="btn">
                Voir le commentaire
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par PM - Gestion de Projets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bonjour ${recipient.nom_complet},

${author.nom_complet} a ajouté un commentaire sur la tâche "${task.titre}":

"${comment.contenu}"

Voir le commentaire: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/comments

--
PM - Gestion de Projets
    `
  }),

  // Notification de sprint démarré
  sprintStarted: (sprint, project, recipient) => ({
    subject: `[PM] Sprint démarré: ${sprint.nom}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
          .sprint-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">PM - Gestion de Projets</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${recipient.nom_complet},</h2>
            <p>Un nouveau sprint a démarré :</p>

            <div class="sprint-info">
              <h3 style="margin-top: 0; color: #4f46e5;">${sprint.nom}</h3>
              <p><strong>Projet:</strong> ${project?.nom || 'Non spécifié'}</p>
              <p><strong>Objectif:</strong> ${sprint.objectif || 'Non défini'}</p>
              <p><strong>Période:</strong> ${new Date(sprint.date_début).toLocaleDateString('fr-FR')} - ${new Date(sprint.date_fin).toLocaleDateString('fr-FR')}</p>
            </div>

            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/sprints" class="btn">
                Voir le sprint
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par PM - Gestion de Projets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bonjour ${recipient.nom_complet},

Un nouveau sprint a démarré :

Sprint: ${sprint.nom}
Projet: ${project?.nom || 'Non spécifié'}
Objectif: ${sprint.objectif || 'Non défini'}
Période: ${new Date(sprint.date_début).toLocaleDateString('fr-FR')} - ${new Date(sprint.date_fin).toLocaleDateString('fr-FR')}

Voir le sprint: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/sprints

--
PM - Gestion de Projets
    `
  }),

  // Rappel d'échéance
  deadlineReminder: (task, project, recipient, daysRemaining) => ({
    subject: `[PM] Rappel: Échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} - ${task.titre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
          .warning { background: #fef3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">[WARNING] Rappel d'échéance</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${recipient.nom_complet},</h2>

            <div class="warning">
              <p style="margin: 0;"><strong>La tâche "${task.titre}" arrive à échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}.</strong></p>
            </div>

            <p><strong>Projet:</strong> ${project?.nom || 'Non spécifié'}</p>
            <p><strong>Échéance:</strong> ${new Date(task.date_échéance).toLocaleDateString('fr-FR')}</p>
            <p><strong>Statut actuel:</strong> ${task.statut}</p>

            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tasks" class="btn">
                Voir la tâche
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par PM - Gestion de Projets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bonjour ${recipient.nom_complet},

RAPPEL: La tâche "${task.titre}" arrive à échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}.

Projet: ${project?.nom || 'Non spécifié'}
Échéance: ${new Date(task.date_échéance).toLocaleDateString('fr-FR')}
Statut actuel: ${task.statut}

Voir la tâche: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/tasks

--
PM - Gestion de Projets
    `
  }),

  // Alerte budget
  budgetAlert: (project, percentage, recipient) => ({
    subject: `[PM] Alerte Budget: ${project.nom} à ${percentage}%`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${percentage >= 100 ? '#ef4444' : '#f97316'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
          .alert { background: ${percentage >= 100 ? '#fee2e2' : '#fef3cd'}; border: 1px solid ${percentage >= 100 ? '#ef4444' : '#ffc107'}; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .progress { background: #e5e7eb; border-radius: 10px; height: 20px; overflow: hidden; }
          .progress-bar { background: ${percentage >= 100 ? '#ef4444' : '#f97316'}; height: 100%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚨 Alerte Budget</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${recipient.nom_complet},</h2>

            <div class="alert">
              <p style="margin: 0;"><strong>Le budget du projet "${project.nom}" a atteint ${percentage}% de consommation.</strong></p>
            </div>

            <div class="progress">
              <div class="progress-bar" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <p style="text-align: center; font-size: 24px; font-weight: bold; color: ${percentage >= 100 ? '#ef4444' : '#f97316'};">${percentage}%</p>

            <p><strong>Budget total:</strong> ${project.budget?.prévisionnel?.toLocaleString('fr-FR')} FCFA</p>

            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/budget" class="btn">
                Voir le budget
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par PM - Gestion de Projets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bonjour ${recipient.nom_complet},

ALERTE BUDGET: Le projet "${project.nom}" a atteint ${percentage}% de consommation.

Budget total: ${project.budget?.prévisionnel?.toLocaleString('fr-FR')} FCFA

Voir le budget: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/budget

--
PM - Gestion de Projets
    `
  })
};

/**
 * Envoyer une notification par email
 * @param {string} type - Type de notification
 * @param {Object} data - Données pour le template
 */
export const sendNotificationEmail = async (type, data) => {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email not configured' };
  }

  const template = emailTemplates[type];
  if (!template) {
    return { success: false, error: `Unknown template: ${type}` };
  }

  const { to, ...templateData } = data;
  const emailContent = template(...Object.values(templateData));

  return sendEmail({
    to,
    ...emailContent
  });
};

export default {
  initEmailTransporter,
  isEmailConfigured,
  sendEmail,
  sendNotificationEmail,
  emailTemplates
};
