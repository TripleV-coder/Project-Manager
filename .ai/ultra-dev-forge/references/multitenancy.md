# Multi-Tenancy Patterns — Ultra Dev Forge

## Règle ZERO FAKE en Multi-Tenant

> Chaque query, chaque mutation, chaque lecture de fichier est scopée au tenant actif.
> Une fuite de données inter-tenant est un incident de sécurité P0 immédiat.

---

## Schéma DB Multi-Tenant (Row-Level Security)

```prisma
// schema.prisma — Toutes les tables métier ont tenantId

model Tenant {
  id          String   @id @default(cuid())
  slug        String   @unique  // pour subdomain routing : acme.app.com
  name        String
  plan        Plan     @default(FREE)

  // Quotas
  maxUsers    Int      @default(5)
  maxProjects Int      @default(10)
  storageGb   Float    @default(1.0)

  members     TenantMember[]
  projects    Project[]
  subscription Subscription?
  auditLogs   AuditLog[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TenantMember {
  id        String     @id @default(cuid())
  tenantId  String
  userId    String
  role      TenantRole @default(MEMBER)

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  invitedAt DateTime   @default(now())
  joinedAt  DateTime?

  @@unique([tenantId, userId])
  @@index([tenantId])
  @@index([userId])
}

// Toutes les tables métier incluent tenantId
model Project {
  id        String   @id @default(cuid())
  tenantId  String   // OBLIGATOIRE
  name      String
  // ...

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

enum TenantRole { OWNER ADMIN MEMBER VIEWER }
enum Plan { FREE PRO BUSINESS ENTERPRISE }
```

---

## Row-Level Security PostgreSQL (Couche DB)

```sql
-- Activer RLS sur chaque table métier
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy : un user ne voit que les projets de son tenant
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Setter dans le middleware
-- SET app.current_tenant_id = 'tenant_xxx' au début de chaque request
```

```typescript
// Prisma middleware pour setter automatiquement le tenant context
prisma.$use(async (params, next) => {
  // Injecter tenant_id dans toutes les queries automatiquement
  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = {
      ...params.args.where,
      tenantId: getCurrentTenantId(), // Depuis AsyncLocalStorage
    };
  }
  return next(params);
});
```

---

## Subdomain Routing

```typescript
// middleware.ts (Next.js)
export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const subdomain = hostname.split('.')[0]

  // Ignorer les subdomains système
  if (['www', 'app', 'api', 'admin'].includes(subdomain)) {
    return NextResponse.next()
  }

  // Rewriter l'URL avec le tenant slug
  const url = req.nextUrl.clone()
  url.pathname = `/tenant/${subdomain}${url.pathname}`
  return NextResponse.rewrite(url)
}

// app/tenant/[slug]/layout.tsx
export default async function TenantLayout({ params, children }) {
  const tenant = await db.tenant.findUnique({
    where: { slug: params.slug },
  })

  if (!tenant) notFound()

  // Vérifier que l'user actif appartient à ce tenant
  const session = await getServerSession()
  if (session) {
    const membership = await db.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    })
    if (!membership) redirect('/unauthorized')
  }

  return <TenantProvider tenant={tenant}>{children}</TenantProvider>
}
```

---

## Système d'Invitation

```typescript
// Flux complet : invitation → email → acceptation → membership créé en DB

// 1. Créer l'invitation
async function inviteMember(tenantId: string, email: string, role: TenantRole, invitedBy: string) {
  // Vérifier le quota
  const memberCount = await db.tenantMember.count({ where: { tenantId } });
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { maxUsers: true },
  });
  if (memberCount >= tenant!.maxUsers) throw new QuotaExceededError('User limit reached');

  // Générer un token signé
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(token, 10);

  const invitation = await db.invitation.create({
    data: {
      tenantId,
      email,
      role,
      invitedById: invitedBy,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    },
  });

  // Envoyer l'email avec le token en clair (pas le hash)
  await mailer.sendInvitation({ email, tenantId, token, invitedBy });

  await eventBus.emit('member.invited', { tenantId, email, role });
}

// 2. Accepter l'invitation
async function acceptInvitation(token: string, userId: string) {
  const invitations = await db.invitation.findMany({
    where: { expiresAt: { gt: new Date() }, acceptedAt: null },
  });

  // Comparer avec bcrypt (timing-safe)
  let validInvitation = null;
  for (const inv of invitations) {
    if (await bcrypt.compare(token, inv.token)) {
      validInvitation = inv;
      break;
    }
  }

  if (!validInvitation) throw new InvalidTokenError();

  await db.$transaction([
    db.tenantMember.create({
      data: {
        tenantId: validInvitation.tenantId,
        userId,
        role: validInvitation.role,
        joinedAt: new Date(),
      },
    }),
    db.invitation.update({
      where: { id: validInvitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);
}
```

---

## Quotas & Limites par Plan

```typescript
// lib/quotas.ts
const PLAN_LIMITS = {
  FREE: { maxUsers: 3, maxProjects: 5, storageGb: 0.5, aiCallsPerMonth: 100 },
  PRO: { maxUsers: 15, maxProjects: 50, storageGb: 20, aiCallsPerMonth: 2000 },
  BUSINESS: { maxUsers: 100, maxProjects: 500, storageGb: 100, aiCallsPerMonth: 20000 },
  ENTERPRISE: { maxUsers: -1, maxProjects: -1, storageGb: -1, aiCallsPerMonth: -1 }, // illimité
} as const;

async function checkQuota(
  tenantId: string,
  resource: keyof (typeof PLAN_LIMITS)['FREE'],
  currentCount: number
): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const limit = PLAN_LIMITS[tenant!.plan][resource];

  if (limit !== -1 && currentCount >= limit) {
    throw new QuotaExceededError(`${resource} limit reached for plan ${tenant!.plan}`);
  }
}
```

---

## Audit Log Multi-Tenant

```typescript
// Chaque action sur une ressource tenant est loggée
async function auditLog(params: {
  tenantId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress: string;
}) {
  await db.auditLog.create({ data: params });
}

// Utilisation dans les services
await userService.updateRole(userId, newRole);
await auditLog({
  tenantId,
  actorId: session.user.id,
  action: 'member.role_changed',
  targetType: 'TenantMember',
  targetId: userId,
  before: { role: oldRole },
  after: { role: newRole },
  ipAddress: req.ip,
});
```
