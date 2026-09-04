import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import { ensureDefaultProjectTemplates } from '@/lib/systemSeed';

export const POST = withApiProtection(async (_request, context) => {
  const { user } = context;
  const templates = await ensureDefaultProjectTemplates(user._id);
  const template = templates[0] || null;
  return NextResponse.json({ success: true, template, data: templates });
});
