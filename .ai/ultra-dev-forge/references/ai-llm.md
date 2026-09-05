# AI / LLM Integration Patterns — Ultra Dev Forge

## Règle Fondamentale AI + ZERO FAKE

> Chaque réponse IA affichée dans l'UI vient d'un vrai appel API.
> Jamais de réponse simulée, jamais de délai fake, jamais de "typing animation" sur du texte hardcodé.

---

## Architecture Recommandée

```
User Input → Frontend
           → API Route (validation + auth + rate limit)
           → AI Service (prompt construction + call)
           → LLM Provider (OpenAI / Anthropic / Mistral)
           → Response Stream
           → UI (token par token, real-time)
           → DB (sauvegarder la conversation/résultat)
```

---

## Streaming — Implémentation Correcte

### Server (Next.js App Router)

```typescript
// app/api/ai/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // 1. Auth check
  const session = await getServerSession();
  if (!session || session.user.id !== userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limit
  const allowed = await rateLimiter.check(`ai:${userId}`, 20, '1h');
  if (!allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. PII scrubbing avant envoi
  const sanitizedMessages = messages.map(scrubPII);

  // 4. Stream réel depuis l'API
  const client = new Anthropic();
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: sanitizedMessages,
  });

  // 5. Tracker l'usage (coût)
  stream.on('finalMessage', async (message) => {
    await db.aiUsage.create({
      data: {
        userId,
        model: message.model,
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        costUsd: calculateCost(message.model, message.usage),
        featureKey: 'chat',
      },
    });
  });

  // 6. Retourner le stream HTTP réel
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### Client (React)

```typescript
// hooks/useAIChat.ts
export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const send = async (userMessage: string) => {
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsStreaming(true);

    // Ajouter le message assistant vide pour le streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.ok) {
      const error = await res.json();
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '', error: error.message },
      ]);
      setIsStreaming(false);
      return;
    }

    // Lire le stream réel token par token
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // Parser les SSE events
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += data.delta.text;
              return updated;
            });
          }
        }
      }
    }

    setIsStreaming(false);
  };

  return { messages, isStreaming, send };
}
```

---

## RAG — Retrieval Augmented Generation

```typescript
// Pipeline complet : ingest → embed → store → retrieve → augment → generate

// 1. INGEST — lors de la création/mise à jour de contenu
async function ingestDocument(documentId: string) {
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError('Document');

  // Chunking intelligent (pas de coupure au milieu d'une phrase)
  const chunks = splitIntoChunks(document.content, {
    maxTokens: 512,
    overlap: 50,
    respectSentences: true,
  });

  // Embedding via API réelle
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map((c) => c.text),
  });

  // Stocker dans pgvector
  await db.$executeRaw`
    INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index)
    VALUES ${chunks.map(
      (chunk, i) =>
        Prisma.sql`(${cuid()}, ${documentId}, ${chunk.text}, ${embeddings.data[i].embedding}::vector, ${i})`
    )}
    ON CONFLICT (document_id, chunk_index) DO UPDATE
    SET content = EXCLUDED.content, embedding = EXCLUDED.embedding
  `;
}

// 2. RETRIEVE — lors d'une query utilisateur
async function retrieveRelevantChunks(query: string, tenantId: string, limit = 5) {
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  // Cosine similarity search — données réelles uniquement
  const chunks = await db.$queryRaw<DocumentChunk[]>`
    SELECT dc.content, d.title, d.id,
           1 - (dc.embedding <=> ${queryEmbedding.data[0].embedding}::vector) as similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.tenant_id = ${tenantId}
      AND 1 - (dc.embedding <=> ${queryEmbedding.data[0].embedding}::vector) > 0.7
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return chunks;
}
```

---

## Tool Calling (Function Calling)

```typescript
// Définir les outils avec types stricts
const tools = [
  {
    name: 'get_user_projects',
    description: "Récupère la liste des projets de l'utilisateur",
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'archived', 'all'] },
        limit: { type: 'number', minimum: 1, maximum: 50 },
      },
      required: ['status'],
    },
  },
] as const;

// Exécuteur de tools — connecté à la vraie DB, jamais fake
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case 'get_user_projects': {
      const projects = await db.project.findMany({
        where: {
          userId,
          ...(input.status !== 'all' ? { status: input.status as string } : {}),
        },
        take: (input.limit as number) ?? 10,
        orderBy: { updatedAt: 'desc' },
      });
      return JSON.stringify(projects);
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

---

## Gestion des Coûts

```typescript
// Coût par modèle (à mettre à jour régulièrement)
const MODEL_COSTS = {
  'claude-opus-4-6': { input: 15, output: 75 }, // $ per 1M tokens
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
} as const;

function calculateCost(
  model: string,
  usage: { input_tokens: number; output_tokens: number }
): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
  if (!costs) return 0;
  return (usage.input_tokens * costs.input + usage.output_tokens * costs.output) / 1_000_000;
}

// Dashboard admin : coûts réels par user/feature/jour
// SELECT feature_key, DATE(created_at), SUM(cost_usd), SUM(prompt_tokens + completion_tokens)
// FROM ai_usage WHERE created_at > NOW() - INTERVAL '30 days'
// GROUP BY 1, 2 ORDER BY 2 DESC, 3 DESC
```

---

## Prompt Engineering — Règles de Production

```typescript
// lib/prompts/[feature].ts — Prompts versionnés dans des fichiers dédiés
// JAMAIS de prompt inline dans le code de l'application

export const DOCUMENT_SUMMARY_PROMPT = {
  version: '2.1',
  system: `You are a professional document analyst. 
  Analyze the provided document and return a structured summary.
  Always respond in the same language as the document.
  Never fabricate information not present in the document.`,

  user: (document: { title: string; content: string; language: string }) =>
    `Document title: ${document.title}\n\nContent:\n${document.content.slice(0, 50000)}`,
};

// Test automatique des prompts en CI
// Vérifier que le output respecte le format attendu
// Vérifier que le coût estimé est dans le budget
```

---

## Guardrails et Safety

```typescript
// PII Scrubbing avant envoi au LLM
function scrubPII(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  // Ajouter des patterns selon le secteur (IBAN, SIRET, etc.)
}

// Moderation des outputs (si contenu public)
async function moderateOutput(text: string): Promise<{ safe: boolean; reason?: string }> {
  const result = await openai.moderations.create({ input: text });
  const flagged = result.results[0].flagged;
  return { safe: !flagged, reason: flagged ? 'Content policy violation' : undefined };
}
```
