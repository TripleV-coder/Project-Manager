import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/auditService';
import File from '@/models/File';
import Project from '@/models/Project';
import Deliverable from '@/models/Deliverable';
import notificationService from '@/lib/services/notificationService';
import { promises as fs } from 'fs';
import path from 'path';
import { withApiProtection } from '@/lib/withApiProtection';

// POST /api/files/upload
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const formData = await request.formData();
    const file = formData.get('file');
    const entity_type = formData.get('entity_type');
    const entity_id = formData.get('entity_id');
    const description = formData.get('description');

    if (!file || !entity_type || !entity_id) {
      return NextResponse.json(
        { success: false, error: "Fichier et informations d'entité requis" },
        { status: 400 }
      );
    }

    // Process file storage (local for now, as in the monolith)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', entity_type);
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFilename);
    const fileUrl = `/uploads/${entity_type}/${safeFilename}`;

    await fs.writeFile(filePath, buffer);

    const newFile = await File.create({
      nom: file.name,
      chemin: fileUrl,
      taille: file.size,
      type_mime: file.type,
      entity_type,
      entity_id,
      description: description || '',
      uploadé_par: user._id,
    });

    // Update project stats if applicable
    if (entity_type === 'projet') {
      await Project.findByIdAndUpdate(entity_id, {
        $inc: { 'stats.total_fichiers': 1 },
      });
    }

    // Notification pour les livrables
    if (entity_type === 'livrable') {
      const deliverable = await Deliverable.findById(entity_id);
      if (deliverable) {
        await notificationService.notifyDeliverableUploaded(
          deliverable.projet_id,
          deliverable.nom,
          user._id
        );
      }
    }

    await logActivity(user, 'création', 'fichier', newFile._id, `Upload fichier ${file.name}`, {
      request,
      httpMethod: 'POST',
      endpoint: '/files/upload',
      httpStatus: 201,
    });

    return NextResponse.json({ success: true, data: newFile }, { status: 201 });
  },
  { rateLimitPreset: 'upload', maxBodySize: 10485760 }
);
