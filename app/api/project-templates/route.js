import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import { validateBody } from '@/lib/validate';
import { createTemplateSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import ProjectTemplate from '@/models/ProjectTemplate';
import { ensureDefaultProjectTemplates } from '@/lib/systemSeed';

export const GET = withApiProtection(async (request, context) => {
  const { user } = context;
  const url = new URL(request.url);
  const categorie = url.searchParams.get('catégorie');

  await ensureDefaultProjectTemplates(user._id);

  const filter = {};
  if (categorie) filter.catégorie = categorie;

  const templates = await ProjectTemplate.find(filter).sort({ created_at: -1 }).lean();

  return NextResponse.json({ success: true, data: templates });
});

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createTemplateSchema);
    if (!validation.success) return validation.response;

    const template = await ProjectTemplate.create({
      ...validation.data,
      créé_par: user._id,
    });

    await logActivity(
      user,
      'création',
      'template',
      template._id,
      `Création template ${template.nom}`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/project-templates',
        httpStatus: 201,
      }
    );

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  },
  { requiredPermissions: ['adminConfig'] }
);
