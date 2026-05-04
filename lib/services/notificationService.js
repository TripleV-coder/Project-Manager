import Notification from '@/models/Notification';
import Project from '@/models/Project';
import User from '@/models/User';
import pushNotificationService from './pushNotificationService';
import connectDB from '@/lib/mongodb';
import { createLogger } from '@/lib/logger';

const _log = createLogger('notificationService');

/**
 * Service centralisé pour la gestion des notifications métier
 */
class NotificationService {
  /**
   * Créer une notification en base et tenter l'envoi push
   * @param {Object} params - Paramètres de la notification
   */
  async createNotification({
    destinataire,
    type,
    titre,
    message,
    entity_type,
    entity_id,
    entity_nom,
    lien,
    expéditeur,
    priority = 'info',
    canaux = { in_app: true, push: true, email: false },
  }) {
    try {
      await connectDB();

      const notification = await Notification.create({
        destinataire,
        type,
        titre,
        message,
        entity_type,
        entity_id,
        entity_nom,
        lien,
        expéditeur,
        priority,
        canaux,
        lu: false,
        created_at: new Date(),
      });

      // Tentative de notification push si configuré
      if (canaux.push) {
        // Logique pour récupérer la subscription et envoyer le push
        // Note: nécessite de stocker les subscriptions push dans le modèle User
        const user = await User.findById(destinataire).select('push_subscriptions');
        if (user?.push_subscriptions?.length > 0) {
          const payload = pushNotificationService.createNotificationPayload(type, {
            title: titre,
            body: message,
            url: lien,
            id: entity_id,
          });

          for (const sub of user.push_subscriptions) {
            await pushNotificationService.sendPushNotification(sub, payload);
          }
        }
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService] Erreur création notification:', error);
      return null;
    }
  }

  /**
   * Alerte de changement de gouvernance
   */
  async notifyGovernanceChange(projectId, modifierId) {
    const project = await Project.findById(projectId).populate('membres.user_id chef_projet');
    if (!project) return;

    const modifier = await User.findById(modifierId).select('nom_complet');
    const modifierName = modifier?.nom_complet || 'Un utilisateur';

    const membersToNotify = this._getProjectRecipients(project, modifierId);

    const promises = membersToNotify.map((memberId) =>
      this.createNotification({
        destinataire: memberId,
        type: 'autre',
        titre: 'Mise à jour de la gouvernance',
        message: `${modifierName} a mis à jour les informations de gouvernance du projet "${project.nom}".`,
        entity_type: 'projet',
        entity_id: project._id,
        entity_nom: project.nom,
        lien: `/dashboard/projects/${project._id}`,
        expéditeur: modifierId,
        priority: 'warning',
      })
    );

    await Promise.all(promises);
  }

  /**
   * Alerte de consommation budgétaire
   */
  async notifyBudgetAlert(projectId, percentage) {
    const project = await Project.findById(projectId).populate('chef_projet');
    if (!project || !project.chef_projet) return;

    await this.createNotification({
      destinataire: project.chef_projet._id,
      type: 'budget_d\u00e9pass\u00e9',
      titre: 'Alerte Budget',
      message: `Attention : le projet "${project.nom}" a consommé ${percentage}% de son budget prévisionnel.`,
      entity_type: 'projet',
      entity_id: project._id,
      entity_nom: project.nom,
      lien: `/dashboard/budget?project=${project._id}`,
      priority: percentage >= 100 ? 'critical' : 'warning',
    });
  }

  /**
   * Notification de nouveau livrable uploadé
   */
  async notifyDeliverableUploaded(projectId, deliverableName, uploaderId) {
    const project = await Project.findById(projectId).populate('chef_projet');
    if (!project) return;

    const uploader = await User.findById(uploaderId).select('nom_complet');

    await this.createNotification({
      destinataire: project.chef_projet._id,
      type: 'commentaire', // On utilise commentaire ou autre type adapté
      titre: 'Nouveau fichier livrable',
      message: `${uploader?.nom_complet || 'Un membre'} a déposé un fichier pour le livrable "${deliverableName}".`,
      entity_type: 'projet',
      entity_id: project._id,
      entity_nom: project.nom,
      lien: `/dashboard/projects/${project._id}?tab=livrables`,
      expéditeur: uploaderId,
    });
  }

  /**
   * Helper pour obtenir tous les destinataires pertinents d'un projet
   * @private
   */
  _getProjectRecipients(project, excludeId) {
    const recipients = new Set();

    if (project.chef_projet?._id) recipients.add(project.chef_projet._id.toString());

    if (project.membres) {
      project.membres.forEach((m) => {
        if (m.user_id?._id) recipients.add(m.user_id._id.toString());
        else if (m.user_id) recipients.add(m.user_id.toString());
      });
    }

    if (excludeId) recipients.delete(excludeId.toString());

    return Array.from(recipients);
  }
}

export default new NotificationService();
