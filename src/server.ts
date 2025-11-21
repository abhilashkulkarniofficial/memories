import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { MemorySystem } from './memory-system.js'

// Validation schemas
const addMemorySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  content: z.string().min(1, 'content is required'),
  metadata: z.record(z.any()).optional(),
})

const searchMemorySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  query: z.string().min(1, 'query is required'),
  limit: z.number().min(1).max(50).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
})

const chatSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  message: z.string().min(1, 'message is required'),
  systemPrompt: z.string().optional(),
  includeMemoryContext: z.boolean().optional(),
  maxContextMemories: z.number().min(1).max(20).optional(),
  stream: z.boolean().optional(),
})

const deleteMemorySchema = z.object({
  id: z.string().min(1, 'id is required'),
})

const deleteUserMemoriesSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
})

// Initialize memory system
const memorySystem = new MemorySystem({
  embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
  chatModel: process.env.CHAT_MODEL || 'llama3.2',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
})

// Initialize on startup
await memorySystem.initialize()

// Create Hono app
const app = new Hono()

// Enable CORS
app.use('/*', cors())

// Health check
app.get('/health', async (c) => {
  const health = await memorySystem.healthCheck()
  const isHealthy = health.qdrant && health.ollama

  return c.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services: health,
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  )
})

// Add memory
app.post('/api/memories', async (c) => {
  try {
    const body = await c.req.json()
    const validated = addMemorySchema.parse(body)

    const memoryIds = await memorySystem.addMemory({
      userId: validated.userId,
      content: validated.content,
      metadata: validated.metadata,
    })

    return c.json({
      success: true,
      memoryIds,
      count: memoryIds.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      )
    }

    console.error('Error adding memory:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Search memories
app.post('/api/search', async (c) => {
  try {
    const body = await c.req.json()
    const validated = searchMemorySchema.parse(body)

    const results = await memorySystem.searchMemories({
      userId: validated.userId,
      query: validated.query,
      limit: validated.limit,
      scoreThreshold: validated.scoreThreshold,
    })

    return c.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      )
    }

    console.error('Error searching memories:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Chat endpoint
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json()
    const validated = chatSchema.parse(body)

    // Handle streaming
    if (validated.stream) {
      const stream = memorySystem.chatStream({
        userId: validated.userId,
        message: validated.message,
        systemPrompt: validated.systemPrompt,
        includeMemoryContext: validated.includeMemoryContext,
        maxContextMemories: validated.maxContextMemories,
      })

      return c.body(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                controller.enqueue(new TextEncoder().encode(chunk))
              }
              controller.close()
            } catch (error) {
              controller.error(error)
            }
          },
        }),
        200,
        {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        }
      )
    }

    // Non-streaming response
    const result = await memorySystem.chat({
      userId: validated.userId,
      message: validated.message,
      systemPrompt: validated.systemPrompt,
      includeMemoryContext: validated.includeMemoryContext,
      maxContextMemories: validated.maxContextMemories,
    })

    return c.json({
      success: true,
      ...result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      )
    }

    console.error('Error in chat:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Delete memory
app.delete('/api/memories/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await memorySystem.deleteMemory(id)

    return c.json({
      success: true,
      message: 'Memory deleted',
    })
  } catch (error) {
    console.error('Error deleting memory:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Delete all user memories
app.delete('/api/users/:userId/memories', async (c) => {
  try {
    const userId = c.req.param('userId')
    await memorySystem.deleteUserMemories(userId)

    return c.json({
      success: true,
      message: 'User memories deleted',
    })
  } catch (error) {
    console.error('Error deleting user memories:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Get memory count
app.get('/api/stats', async (c) => {
  try {
    const userId = c.req.query('userId')
    const count = await memorySystem.getMemoryCount(userId)

    return c.json({
      success: true,
      count,
      userId: userId || 'all',
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Start server
const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Local Memory System API running on http://localhost:${port}`)
console.log(`📊 Health check: http://localhost:${port}/health`)
console.log(`💾 Vector store: ${process.env.QDRANT_URL || 'http://localhost:6333'}`)
console.log(`🤖 Embedding model: ${process.env.EMBEDDING_MODEL || 'nomic-embed-text'}`)
console.log(`💬 Chat model: ${process.env.CHAT_MODEL || 'llama3.2'}`)

export default {
  port,
  fetch: app.fetch,
}
