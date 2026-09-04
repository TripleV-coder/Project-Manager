import { NextResponse } from 'next/server';
import ProjectTemplate from '@/models/ProjectTemplate';
import { validateBody } from '@/lib/validate';
import { createTemplateSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';

export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;
    const validation = await validateBody(request, createTemplateSchema.partial());
    if (!validation.success) return validation.response;

    const updated = await ProjectTemplate.findByIdAndUpdate(params.id, validation.data, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    await logActivity(
      user,
      'modification',
      'template',
      params.id,
      `Modification template ${updated.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/project-templates/${params.id}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ['adminConfig'] }
);

export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;
    const template = await ProjectTemplate.findById(params.id);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    await ProjectTemplate.findByIdAndDelete(params.id);

    await logActivity(
      user,
      'suppression',
      'template',
      params.id,
      `Suppression template ${template.nom}`,
      {
        request,
        httpMethod: 'DELETE',
        endpoint: `/project-templates/${params.id}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true });
  },
  { requiredPermissions: ['adminConfig'] }
);
