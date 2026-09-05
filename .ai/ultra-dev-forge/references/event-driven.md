# Event-Driven Architecture — CQRS & Event Bus — Ultra Dev Forge

## Règle ZERO FAKE

> Chaque event publié correspond à une vraie mutation en DB.
> Chaque handler d'event lit et écrit des données réelles.
> Jamais de `emit('fake.event')` pour tester l'UI.

---

## Event Bus — Implémentation Production (BullMQ)

```typescript
// lib/event-bus.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// Typage fort de tous les events — SSOT
export type AppEventMap = {
  'user.registered': { userId: string; email: string; tenantId?: string };
  'user.deleted': { userId: string; tenantId: string };
  'payment.succeeded': {
    userId: string;
    tenantId: string;
    amount: number;
    planId: string;
    stripeInvoiceId: string;
  };
  'payment.failed': { userId: string; tenantId: string; errorCode: string };
  'subscription.upgraded': { tenantId: string; fromPlan: string; toPlan: string };
  'subscription.cancelled': { tenantId: string; reason: string; endDate: Date };
  'document.created': { documentId: string; tenantId: string; authorId: string };
  'document.deleted': { documentId: string; tenantId: string; deletedById: string };
  'member.invited': { tenantId: string; email: string; role: string };
  'member.joined': { tenantId: string; userId: string; role: string };
  'member.removed': { tenantId: string; userId: string; removedById: string };
  'webhook.delivery.failed': { endpointId: string; eventType: string; attempt: number };
};

type AppEvent = {
  [K in keyof AppEventMap]: { type: K; payload: AppEventMap[K] };
}[keyof AppEventMap];

const redis = new Redis(process.env.REDIS_URL!);
const eventQueue = new Queue<AppEvent>('app-events', { connection: redis });

export const eventBus = {
  async emit<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]): Promise<void> {
    await eventQueue.add(
      type,
      { type, payload },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 }, // 1min, 5min, 25min...
        removeOnComplete: { age: 86400 }, // garder 24h
        removeOnFail: { age: 604800 }, // garder 7 jours pour debug
      }
    );
  },
};

// Worker — traite les events de manière asynchrone
export function startEventWorker() {
  const worker = new Worker<AppEvent>(
    'app-events',
    async (job) => {
      const { type, payload } = job.data;
      const handlers = eventHandlers[type] ?? [];

      // Exécuter tous les handlers en parallèle
      await Promise.allSettled(handlers.map((handler) => handler(payload as never)));
    },
    { connection: redis, concurrency: 10 }
  );

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, event: job?.data.type, error: error.message },
      'Event handler failed'
    );
  });

  return worker;
}
```

---

## Registry des Handlers

```typescript
// lib/event-handlers/index.ts
import { AppEventMap } from '../event-bus';

type Handler<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => Promise<void>;
type EventHandlerRegistry = { [K in keyof AppEventMap]?: Handler<K>[] };

export const eventHandlers: EventHandlerRegistry = {
  'user.registered': [
    sendWelcomeEmail,
    initOnboardingSequence,
    trackUserRegistered,
    createDefaultWorkspace,
  ],

  'payment.succeeded': [
    upgradeSubscriptionInDB,
    sendReceiptEmail,
    unlockPlanFeatures,
    trackRevenue,
  ],

  'payment.failed': [sendPaymentFailedEmail, scheduleRetryNotification, trackPaymentFailure],

  'member.invited': [sendInvitationEmail, trackInvitationSent],

  'subscription.cancelled': [scheduleDowngrade, sendCancellationEmail, trackChurn],
};

// Implémentation réelle de chaque handler
async function sendWelcomeEmail({ userId, email }: AppEventMap['user.registered']) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return; // L'user peut avoir été supprimé entre temps

  await mailer.send({
    to: email,
    template: 'welcome',
    data: {
      firstName: user.firstName ?? 'there',
      dashboardUrl: `${process.env.APP_URL}/dashboard`,
    },
  });
}

async function upgradeSubscriptionInDB({ tenantId, planId }: AppEventMap['payment.succeeded']) {
  await db.subscription.upsert({
    where: { tenantId },
    update: { plan: planId, status: 'active', updatedAt: new Date() },
    create: { tenantId, plan: planId, status: 'active' },
  });

  // Mettre à jour les quotas du tenant
  const planLimits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS];
  await db.tenant.update({
    where: { id: tenantId },
    data: { plan: planId, maxUsers: planLimits.maxUsers, maxProjects: planLimits.maxProjects },
  });
}
```

---

## CQRS — Command Query Responsibility Segregation

```typescript
// Commands : mutations avec validation + event emission
// Queries : lectures optimisées, pas d'effets de bord

// COMMAND SIDE
interface CreateProjectCommand {
  tenantId: string;
  authorId: string;
  name: string;
  description?: string;
  templateId?: string;
}

async function handleCreateProject(cmd: CreateProjectCommand): Promise<Project> {
  // 1. Validation business
  const nameExists = await db.project.findFirst({
    where: { tenantId: cmd.tenantId, name: cmd.name },
  });
  if (nameExists) throw new ConflictError('Project name already exists in this workspace');

  // 2. Vérifier quota
  const count = await db.project.count({ where: { tenantId: cmd.tenantId } });
  await checkQuota(cmd.tenantId, 'maxProjects', count);

  // 3. Appliquer template si demandé
  const templateData = cmd.templateId
    ? await db.projectTemplate.findUnique({ where: { id: cmd.templateId } })
    : null;

  // 4. Créer en DB
  const project = await db.project.create({
    data: {
      tenantId: cmd.tenantId,
      authorId: cmd.authorId,
      name: cmd.name,
      description: cmd.description,
      ...(templateData?.defaultStructure ?? {}),
    },
  });

  // 5. Émettre l'event (toujours APRÈS la persistance)
  await eventBus.emit('document.created', {
    documentId: project.id,
    tenantId: cmd.tenantId,
    authorId: cmd.authorId,
  });

  return project;
}

// QUERY SIDE — Read model optimisé
interface ProjectListQuery {
  tenantId: string;
  userId: string;
  search?: string;
  status?: 'active' | 'archived';
  page: number;
  limit: number;
}

async function queryProjects(query: ProjectListQuery) {
  // Read model direct — pas de JOIN complexe, indexé correctement
  return db.project.findMany({
    where: {
      tenantId: query.tenantId,
      // S'assurer que l'user a accès (RBAC)
      OR: [{ authorId: query.userId }, { members: { some: { userId: query.userId } } }],
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { documents: true, members: true } },
    },
    orderBy: { updatedAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });
}
```

---

## Idempotency — Handlers Sécurisés

```typescript
// Chaque handler doit être idempotent : peut être appelé N fois avec le même résultat
// Utiliser upsert, create-if-not-exists, check-before-act

// Mauvais (pas idempotent)
async function badHandler({ userId }: AppEventMap['user.registered']) {
  await db.welcomeEmail.create({ data: { userId } }); // Erreur si appelé 2x
}

// Bon (idempotent)
async function goodHandler({ userId }: AppEventMap['user.registered']) {
  const alreadySent = await db.welcomeEmail.findUnique({ where: { userId } });
  if (alreadySent) return; // Déjà traité, on skip silencieusement

  await db.welcomeEmail.create({ data: { userId, sentAt: new Date() } });
  await mailer.sendWelcome(userId);
}
```

---

## Event Sourcing (si audit complet requis)

```typescript
// Append-only event store — jamais de modification ou suppression
model EventStore {
  id          String   @id @default(cuid())
  aggregateId String   // ID de l'entité (userId, projectId...)
  aggregateType String // 'User', 'Project'...
  eventType   String
  eventVersion Int     // Pour les migrations de schema
  payload     Json
  metadata    Json     // actorId, ipAddress, userAgent...
  createdAt   DateTime @default(now())

  @@index([aggregateId, aggregateType])
  @@index([createdAt])
}

// Reconstruction d'état depuis les events
async function rebuildUserState(userId: string): Promise<UserState> {
  const events = await db.eventStore.findMany({
    where: { aggregateId: userId, aggregateType: 'User' },
    orderBy: { createdAt: 'asc' },
  })

  return events.reduce(applyUserEvent, initialUserState)
}

function applyUserEvent(state: UserState, event: EventStore): UserState {
  switch (event.eventType) {
    case 'user.registered':
      return { ...state, ...event.payload, status: 'active' }
    case 'user.email_changed':
      return { ...state, email: (event.payload as any).newEmail }
    case 'user.banned':
      return { ...state, status: 'banned', bannedAt: event.createdAt }
    default:
      return state
  }
}
```
