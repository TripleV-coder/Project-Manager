# Advanced Patterns Library — Ultra Dev Forge

## Patterns Architecturaux

### Repository Pattern (Backend)

```typescript
// Interface (dépend de l'abstraction)
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

// Implémentation Prisma
class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }
  // ...
}
```

### Service Layer Pattern

```typescript
// Toute la business logic ici, jamais dans les controllers
class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly mailer: EmailService,
    private readonly events: EventBus
  ) {}

  async register(dto: RegisterDTO): Promise<User> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    const user = await this.users.create({
      ...dto,
      password: await hash(dto.password, 12),
    });

    await this.mailer.sendWelcome(user);
    await this.events.emit('user.registered', { userId: user.id });

    return user;
  }
}
```

### Result Pattern (éviter les exceptions pour le flow control)

```typescript
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function parseUserInput(raw: unknown): Promise<Result<User, ValidationError>> {
  const result = UserSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: new ValidationError(result.error) };
  }
  return { success: true, data: result.data };
}

// Usage
const result = await parseUserInput(req.body);
if (!result.success) return res.status(400).json({ error: result.error.message });
const user = result.data;
```

---

## Patterns React/Frontend

### Custom Hook Pattern

```typescript
// Encapsuler toute la logique dans des hooks
function useUsers(filters: UserFilters) {
  const queryKey = ['users', filters];

  const query = useQuery({
    queryKey,
    queryFn: () => api.users.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: api.users.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createUser: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

### Compound Component Pattern

```typescript
// Pour les composants complexes avec état partagé
const SelectContext = createContext<SelectContextValue | null>(null)

function Select({ children, value, onChange }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div role="listbox">{children}</div>
    </SelectContext.Provider>
  )
}

Select.Option = function SelectOption({ value, children }: OptionProps) {
  const ctx = useContext(SelectContext)!
  return (
    <div
      role="option"
      aria-selected={ctx.value === value}
      onClick={() => ctx.onChange(value)}
    >
      {children}
    </div>
  )
}
```

### Optimistic Update Pattern

```typescript
const updateTodo = useMutation({
  mutationFn: api.todos.update,
  onMutate: async (newTodo) => {
    // Annuler les refetch en cours
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot de l'état précédent
    const previous = queryClient.getQueryData<Todo[]>(['todos']);

    // Mise à jour optimiste immédiate
    queryClient.setQueryData<Todo[]>(
      ['todos'],
      (old) => old?.map((t) => (t.id === newTodo.id ? { ...t, ...newTodo } : t)) ?? []
    );

    return { previous };
  },
  onError: (err, newTodo, context) => {
    // Rollback si erreur
    queryClient.setQueryData(['todos'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

---

## Patterns de Sécurité

### Branded Types (éviter les confusions d'IDs)

```typescript
type UserId = string & { readonly brand: 'UserId' };
type ProjectId = string & { readonly brand: 'ProjectId' };

// Plus jamais de confusion entre les types d'IDs
function getProject(projectId: ProjectId, userId: UserId): Promise<Project> {
  // userId et projectId ne peuvent pas être inversés à l'appel
}

// Création via helpers
const userId = 'user_123' as UserId;
```

### Authorization Check Pattern

```typescript
// Toujours vérifier ownership, jamais juste le rôle
async function getDocument(documentId: string, requestingUserId: string) {
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { workspace: { include: { members: true } } },
  });

  if (!document) throw new NotFoundError();

  const isMember = document.workspace.members.some((m) => m.userId === requestingUserId);

  if (!isMember) throw new ForbiddenError(); // 403, pas 401

  return document;
}
```

### Safe Redirect Pattern

```typescript
const ALLOWED_ORIGINS = new Set(['https://app.example.com', 'https://dashboard.example.com']);

function safeRedirect(redirectTo: string | null): string {
  if (!redirectTo) return '/dashboard';

  try {
    const url = new URL(redirectTo);
    if (!ALLOWED_ORIGINS.has(url.origin)) return '/dashboard';
    return redirectTo;
  } catch {
    // relative URL
    if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      return redirectTo;
    }
    return '/dashboard';
  }
}
```

---

## Patterns de Performance

### Cursor Pagination (préféré à offset)

```typescript
async function paginateUsers(cursor?: string, limit = 20) {
  const users = await db.user.findMany({
    take: limit + 1, // +1 pour savoir s'il y a une page suivante
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
  });

  const hasNextPage = users.length > limit;
  const items = hasNextPage ? users.slice(0, -1) : users;

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
    hasNextPage,
  };
}
```

### Background Job Pattern

```typescript
// Jamais de traitement long dans un endpoint HTTP
// POST /api/reports → 202 Accepted + job ID
async function createReport(req: Request, res: Response) {
  const job = await reportQueue.add('generate', {
    userId: req.user.id,
    params: req.body,
  });

  return res.status(202).json({
    jobId: job.id,
    statusUrl: `/api/jobs/${job.id}`,
  });
}

// GET /api/jobs/:id → polling
async function getJobStatus(req: Request, res: Response) {
  const job = await reportQueue.getJob(req.params.id);

  return res.json({
    status: await job.getState(), // waiting | active | completed | failed
    progress: job.progress,
    result: job.returnvalue ?? null,
  });
}
```

---

## Patterns de Tests

### Testing Library Pattern (Component Tests)

```typescript
// Tester le comportement, pas l'implémentation
test('affiche une erreur si email invalide', async () => {
  const user = userEvent.setup()
  render(<RegisterForm />)

  await user.type(screen.getByLabelText('Email'), 'pas-un-email')
  await user.click(screen.getByRole('button', { name: 'Créer un compte' }))

  expect(
    await screen.findByText('Email invalide')
  ).toBeInTheDocument()
})

// Ne PAS tester :
// - Les props internes
// - Le state du composant
// - Les noms de fonctions
```

### API Test Pattern (Supertest)

```typescript
describe('POST /api/auth/register', () => {
  it('crée un utilisateur avec des données valides', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'SecurePass123!' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password).toBeUndefined(); // jamais exposer
  });

  it('retourne 409 si email déjà utilisé', async () => {
    await createUser({ email: 'existing@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'SecurePass123!' });

    expect(res.status).toBe(409);
  });
});
```

---

## Patterns d'Erreur

### Error Hierarchy Pattern

```typescript
// Hiérarchie d'erreurs typées
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

class ValidationError extends AppError {
  constructor(public readonly issues: z.ZodIssue[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}
```

### Global Error Handler (Express/Next.js)

```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log structuré
  logger.error({
    message: err.message,
    code: err instanceof AppError ? err.code : 'UNKNOWN_ERROR',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    path: req.path,
  });

  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Erreurs inattendues : ne pas exposer les détails
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
```

---

## Patterns Realtime

### WebSocket avec Rooms (Socket.io)

```typescript
// Pattern pub/sub par room
io.on('connection', (socket) => {
  socket.on('join:document', async (documentId: string) => {
    // Vérifier les permissions avant de join
    const canAccess = await checkDocumentAccess(socket.data.userId, documentId);
    if (!canAccess) return socket.emit('error', { code: 'FORBIDDEN' });

    await socket.join(`document:${documentId}`);
    socket.emit('document:joined', { documentId });
  });

  socket.on('document:edit', (data) => {
    // Broadcast aux autres membres du document seulement
    socket.to(`document:${data.documentId}`).emit('document:updated', data);
  });
});
```

---

## Anti-Patterns à Éviter Absolument

```
❌ useEffect pour fetch de données → ✅ TanStack Query
❌ prop drilling > 2 niveaux → ✅ Context ou state manager
❌ any TypeScript → ✅ unknown + type guards
❌ console.log en production → ✅ Logger structuré
❌ SELECT * en production → ✅ Colonnes explicites
❌ Await dans une boucle (N+1) → ✅ Promise.all ou bulk query
❌ Secrets en dur dans le code → ✅ Variables d'environnement
❌ Regex sans limite de longueur → ✅ input.slice(0, MAX) avant regex
❌ Password en MD5/SHA1/SHA256 → ✅ bcrypt/argon2
❌ JWT secret court → ✅ Minimum 256 bits aléatoires
❌ CORS * en production → ✅ Whitelist explicite
❌ Redirect sans validation → ✅ Allowed origins list
```
