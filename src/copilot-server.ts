/**
 * Enhanced API endpoints for Copilot Chat integration
 * with automatic memory refinement and storage
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { MemorySystem } from './memory-system.js'
import { z } from 'zod'

const app = new Hono()
const memorySystem = new MemorySystem()

// Enable CORS for all origins (adjust as needed)
app.use('*', cors())

// Initialize memory system
await memorySystem.initialize()

/**
 * Enhanced chat endpoint with automatic memory integration
 */
const chatWithMemorySchema = z.object({
  userId: z.string(),
  message: z.string(),
  autoRefine: z.boolean().default(true),
  autoStore: z.boolean().default(true),
  includeMemoryContext: z.boolean().default(true),
  systemPrompt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

app.post('/api/copilot/chat', async (c) => {
  try {
    const body = await c.req.json()
    const data = chatWithMemorySchema.parse(body)

    let finalMessage = data.message
    let memoriesUsed = 0
    let memories: string[] = []

    // Step 1: Refine prompt with memories if enabled
    if (data.autoRefine && data.includeMemoryContext) {
      const searchResults = await memorySystem.searchMemories({
        userId: data.userId,
        query: data.message,
        limit: 5,
        scoreThreshold: 0.3,
      })

      if (searchResults.length > 0) {
        memoriesUsed = searchResults.length
        memories = searchResults.map((r) => r.text)

        // Build context
        const context = `\n\nRelevant context from your memories:\n${searchResults
          .map((m, i) => `${i + 1}. ${m.text}`)
          .join('\n')}\n`

        finalMessage = `${context}\nUser request: ${data.message}`
      }
    }

    // Step 2: Generate response with memory context
    const result = await memorySystem.chat({
      userId: data.userId,
      message: finalMessage,
      systemPrompt: data.systemPrompt,
      includeMemoryContext: false, // Already included above
    })

    // Step 3: Auto-store conversation if enabled
    if (data.autoStore) {
      const conversationContent = `Q: ${data.message}\nA: ${result.response}`

      await memorySystem.addMemory({
        userId: data.userId,
        content: conversationContent,
        metadata: {
          ...data.metadata,
          type: 'copilot-conversation',
          timestamp: Date.now(),
          memoriesUsed,
        },
      })
    }

    return c.json({
      response: result.response,
      memoriesUsed,
      memories,
      stored: data.autoStore,
      refined: data.autoRefine && memoriesUsed > 0,
    })
  } catch (error) {
    console.error('Error in copilot chat:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Refine prompt with memories only (no LLM call)
 */
app.post('/api/copilot/refine-prompt', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, prompt, limit = 5 } = body

    // Search for relevant memories
    const memories = await memorySystem.searchMemories({
      userId,
      query: prompt,
      limit,
      scoreThreshold: 0.3,
    })

    // Build refined prompt
    const context =
      memories.length > 0
        ? `\n\nRelevant context from your memories:\n${memories
            .map((m, i) => `${i + 1}. ${m.text}`)
            .join('\n')}\n`
        : ''

    const refinedPrompt = context ? `${context}\nUser request: ${prompt}` : prompt

    return c.json({
      originalPrompt: prompt,
      refinedPrompt,
      memoriesUsed: memories.length,
      memories: memories.map((m) => ({
        text: m.text,
        score: m.score,
        timestamp: m.timestamp,
      })),
    })
  } catch (error) {
    console.error('Error refining prompt:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Store conversation explicitly
 */
app.post('/api/copilot/store-conversation', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, question, answer, metadata = {} } = body

    if (!userId || !question || !answer) {
      return c.json({ error: 'userId, question, and answer are required' }, 400)
    }

    const conversationContent = `Q: ${question}\nA: ${answer}`

    const memoryIds = await memorySystem.addMemory({
      userId,
      content: conversationContent,
      metadata: {
        ...metadata,
        type: 'conversation',
        timestamp: Date.now(),
      },
    })

    return c.json({
      success: true,
      memoryIds,
      stored: 'conversation',
    })
  } catch (error) {
    console.error('Error storing conversation:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Health check
 */
app.get('/api/copilot/health', async (c) => {
  try {
    const health = await memorySystem.healthCheck()
    return c.json({
      status: health.qdrant && health.ollama ? 'healthy' : 'unhealthy',
      services: health,
    })
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Get conversation history
 */
app.get('/api/copilot/conversations/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    // Search for all conversation memories
    const conversations = await memorySystem.searchMemories({
      userId,
      query: 'Q: A:', // Simple pattern to find conversations
      limit: 20,
      scoreThreshold: 0.1,
    })

    return c.json({
      userId,
      conversations: conversations.map((m) => ({
        text: m.text,
        timestamp: m.timestamp,
        metadata: m.metadata,
      })),
      count: conversations.length,
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

const port = parseInt(process.env.COPILOT_PORT || '3001')

console.log(`🤖 Copilot Memory Integration API running on http://localhost:${port}`)
console.log('\nEndpoints:')
console.log(`  POST /api/copilot/chat                - Chat with auto memory refinement`)
console.log(`  POST /api/copilot/refine-prompt       - Refine prompt with memories`)
console.log(`  POST /api/copilot/store-conversation  - Store Q&A pair`)
console.log(`  GET  /api/copilot/health              - Health check`)
console.log(`  GET  /api/copilot/conversations/:id   - Get conversation history`)

// Start the server
serve({
  fetch: app.fetch,
  port,
})

