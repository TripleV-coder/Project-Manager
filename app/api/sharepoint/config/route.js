import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/sharepoint/config
export const GET = withApiProtection(
  async (_request, _context) => {
    return NextResponse.json({
      success: true,
      data: { enabled: false, message: 'SharePoint integration requires configuration' },
    });
  },
  { requiredPermissions: ['adminConfig'] }
);

// POST /api/sharepoint/config
export const POST = withApiProtection(
  async (_request, _context) => {
    return NextResponse.json({ success: true, message: 'SharePoint config saved' });
  },
  { requiredPermissions: ['adminConfig'] }
);
