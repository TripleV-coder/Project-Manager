import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createUserSchema } from '@/lib/schemas';
import { assignTemporaryPassword, sendTemporaryPasswordEmail } from '@/lib/userSecurity';
import { logActivity } from '@/lib/auditService';
import userService from '@/lib/services/userService';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/users
export const GET = withApiProtection(
  async (request, _context) => {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
    const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
    const skip = (page - 1) * limit;

    const { users, total } = await userService.getUsers(limit, skip);

    return NextResponse.json({
      success: true,
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermissions: ['gererUtilisateurs', 'adminConfig'] }
);

// POST /api/users
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createUserSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;
    const { email } = body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      );
    }

    const newUser = new User({
      ...body,
      email: email.toLowerCase(),
      tokenVersion: 0,
    });

    // Assign temp password
    const tempPassword = await assignTemporaryPassword(newUser, {
      firstLogin: true,
      mustChangePassword: true,
    });

    await newUser.save();
    await newUser.populate('role_id');

    // Send temporary password via email (non-blocking)
    await sendTemporaryPasswordEmail(newUser, tempPassword);

    await logActivity(
      user,
      'création',
      'utilisateur',
      newUser._id,
      `Création utilisateur ${newUser.nom_complet}`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/users',
        httpStatus: 201,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        message: 'Utilisateur créé. Le mot de passe temporaire a été envoyé par email.',
      },
      { status: 201 }
    );
  },
  { requiredPermissions: ['gererUtilisateurs', 'adminConfig'] }
);
