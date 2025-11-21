/**
 * HTTP-based MCP Server for GitHub Copilot Integration
 * 
 * Provides MCP tools over HTTP REST API on localhost:3000
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { MemorySystem } from './memory-system.js'
import { z } from 'zod'

const app = new Hono()
const memorySystem = new MemorySystem()

// Enable CORS
app.use('*', cors())

// Initialize memory system
await memorySystem.initialize()

/**
 * Health check
 */
app.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    server: 'MCP HTTP Server',
    tools: ['search_memories', 'add_memory', 'get_memory_stats', 'refine_prompt_with_memories', 'store_conversation']
  })
})

/**
 * List available MCP tools
 */
app.get('/tools', async (c) => {
  return c.json({
    tools: [
      {
        name: 'search_memories',
        description: 'Search for relevant memories based on a query',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID to search memories for' },
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results', default: 5 },
          },
          required: ['userId', 'query'],
        },
      },
      {
        name: 'add_memory',
        description: 'Store new information in memory',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            content: { type: 'string', description: 'Content to store' },
            metadata: { type: 'object', description: 'Optional metadata' },
          },
          required: ['userId', 'content'],
        },
      },
      {
        name: 'get_memory_stats',
        description: 'Get memory statistics for a user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
          },
          required: ['userId'],
        },
      },
      {
        name: 'refine_prompt_with_memories',
        description: 'Enhance a prompt with relevant memories',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            prompt: { type: 'string', description: 'Original prompt' },
            limit: { type: 'number', description: 'Number of memories to include', default: 5 },
          },
          required: ['userId', 'prompt'],
        },
      },
      {
        name: 'store_conversation',
        description: 'Store a Q&A conversation pair',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            question: { type: 'string', description: 'Question asked' },
            answer: { type: 'string', description: 'Answer provided' },
          },
          required: ['userId', 'question', 'answer'],
        },
      },
    ],
  })
})

/**
 * Execute MCP tool
 */
const executeToolSchema = z.object({
  tool: z.string(),
  arguments: z.record(z.any()),
})

app.post('/execute', async (c) => {
  try {
    const body = await c.req.json()
    const { tool, arguments: args } = executeToolSchema.parse(body)

    switch (tool) {
      case 'search_memories': {
        const { userId, query, limit = 5 } = args
        const results = await memorySystem.searchMemories({
          userId,
          query,
          limit,
          scoreThreshold: 0.3,
        })
        return c.json({
          success: true,
          result: results.map((r) => ({
            id: r.id,
            text: r.text,
            score: r.score,
            metadata: r.metadata,
          })),
        })
      }

      case 'add_memory': {
        const { userId, content, metadata = {} } = args
        const result = await memorySystem.addMemory({
          userId,
          content,
          metadata,
        })
        return c.json({
          success: true,
          result: {
            ids: result,
            message: 'Memory stored successfully',
          },
        })
      }

      case 'get_memory_stats': {
        const { userId } = args
        const count = await memorySystem.getMemoryCount(userId)
        return c.json({
          success: true,
          result: {
            userId,
            memoryCount: count,
          },
        })
      }

      case 'refine_prompt_with_memories': {
        const { userId, prompt, limit = 5 } = args
        const memories = await memorySystem.searchMemories({
          userId,
          query: prompt,
          limit,
          scoreThreshold: 0.3,
        })

        let refinedPrompt = prompt
        if (memories.length > 0) {
          const context = memories
            .map((m, i) => `${i + 1}. ${m.text} (relevance: ${(m.score * 100).toFixed(1)}%)`)
            .join('\n')
          
          refinedPrompt = `Context from your memories:\n${context}\n\nUser request: ${prompt}`
        }

        return c.json({
          success: true,
          result: {
            originalPrompt: prompt,
            refinedPrompt,
            memoriesUsed: memories.length,
            memories: memories.map(m => ({
              text: m.text,
              score: m.score,
            })),
          },
        })
      }

      case 'store_conversation': {
        const { userId, question, answer } = args
        const conversationText = `Q: ${question}\nA: ${answer}`
        
        const result = await memorySystem.addMemory({
          userId,
          content: conversationText,
          metadata: {
            type: 'conversation',
            question,
            answer,
            timestamp: new Date().toISOString(),
          },
        })

        return c.json({
          success: true,
          result: {
            ids: result,
            message: 'Conversation stored successfully',
          },
        })
      }

      default:
        return c.json(
          {
            success: false,
            error: `Unknown tool: ${tool}`,
          },
          400
        )
    }
  } catch (error) {
    console.error('Error executing tool:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Shortcut endpoints for common operations
 */
app.post('/search', async (c) => {
  try {
    const { userId, query, limit = 5 } = await c.req.json()
    const results = await memorySystem.searchMemories({
      userId,
      query,
      limit,
      scoreThreshold: 0.3,
    })
    return c.json({
      results: results.map((r) => ({
        id: r.id,
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      })),
    })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

app.post('/add', async (c) => {
  try {
    const { userId, content, metadata = {} } = await c.req.json()
    const result = await memorySystem.addMemory({
      userId,
      content,
      metadata,
    })
    return c.json({
      ids: result,
      message: 'Memory stored successfully',
    })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

app.get('/stats/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const count = await memorySystem.getMemoryCount(userId)
    return c.json({
      userId,
      memoryCount: count,
    })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

const port = parseInt(process.env.MCP_PORT || '3000')

console.log(`🤖 MCP HTTP Server running on http://localhost:${port}`)
console.log('\nMCP Endpoints:')
console.log(`  GET  /health                - Health check`)
console.log(`  GET  /tools                 - List available MCP tools`)
console.log(`  POST /execute               - Execute MCP tool`)
console.log('\nShortcut Endpoints:')
console.log(`  POST /search                - Search memories`)
console.log(`  POST /add                   - Add memory`)
console.log(`  GET  /stats/:userId         - Get statistics`)

// Start the server
serve({
  fetch: app.fetch,
  port,
})
