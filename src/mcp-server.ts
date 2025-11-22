#!/usr/bin/env node
/**
 * MCP Server for GitHub Copilot Integration
 * 
 * This server implements the Model Context Protocol to provide
 * memory context to GitHub Copilot and other AI assistants.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { MemorySystem } from './memory-system.js'

// Initialize memory system
const memorySystem = new MemorySystem()

// Create MCP server
const server = new Server(
  {
    name: 'memory-context-provider',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// Initialize on startup
await memorySystem.initialize()

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_memories',
        description: 'Search for relevant memories based on a query. Returns contextually similar information stored in the user\'s memory system.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to search memories for',
            },
            query: {
              type: 'string',
              description: 'Search query to find relevant memories',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5)',
              default: 5,
            },
          },
          required: ['userId', 'query'],
        },
      },
      {
        name: 'add_memory',
        description: 'Store new information in the memory system for future reference',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to store memory for',
            },
            content: {
              type: 'string',
              description: 'Content to remember',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata (tags, category, etc.)',
            },
          },
          required: ['userId', 'content'],
        },
      },
      {
        name: 'get_memory_stats',
        description: 'Get statistics about stored memories',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to get stats for',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'refine_prompt_with_memories',
        description: 'Automatically search memories and refine the user prompt with relevant context. Use this BEFORE generating responses to provide context-aware answers.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to search memories for',
            },
            prompt: {
              type: 'string',
              description: 'The user\'s original prompt/question',
            },
            autoStore: {
              type: 'boolean',
              description: 'Automatically store the user question as a memory (default: false)',
              default: false,
            },
          },
          required: ['userId', 'prompt'],
        },
      },
      {
        name: 'store_conversation',
        description: 'Store a Q&A conversation pair in memory for future reference. Use this AFTER generating a response to remember the interaction.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to store conversation for',
            },
            question: {
              type: 'string',
              description: 'The user\'s question',
            },
            answer: {
              type: 'string',
              description: 'The generated answer',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata about the conversation',
            },
          },
          required: ['userId', 'question', 'answer'],
        },
      },
    ],
  }
})

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'search_memories': {
        const { userId, query, limit = 5 } = args as {
          userId: string
          query: string
          limit?: number
        }

        const results = await memorySystem.searchMemories({
          userId,
          query,
          limit,
          scoreThreshold: 0.3,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: results.map((r) => ({
                    text: r.text,
                    score: r.score,
                    timestamp: r.timestamp,
                  })),
                  count: results.length,
                },
                null,
                2
              ),
            },
          ],
        }
      }

      case 'add_memory': {
        const { userId, content, metadata = {} } = args as {
          userId: string
          content: string
          metadata?: Record<string, any>
        }

        const memoryIds = await memorySystem.addMemory({
          userId,
          content,
          metadata,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                memoryIds,
                count: memoryIds.length,
              }),
            },
          ],
        }
      }

      case 'get_memory_stats': {
        const { userId } = args as { userId: string }

        const count = await memorySystem.getMemoryCount(userId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                userId,
                totalMemories: count,
              }),
            },
          ],
        }
      }

      case 'refine_prompt_with_memories': {
        const { userId, prompt, autoStore = false } = args as {
          userId: string
          prompt: string
          autoStore?: boolean
        }

        // Search for relevant memories
        const memories = await memorySystem.searchMemories({
          userId,
          query: prompt,
          limit: 5,
          scoreThreshold: 0.3,
        })

        // Build context from memories
        const context = memories.length > 0
          ? `\n\nRelevant context from your memories:\n${memories.map((m, i) => `${i + 1}. ${m.text}`).join('\n')}\n`
          : ''

        // Optionally store the prompt as a memory
        if (autoStore) {
          await memorySystem.addMemory({
            userId,
            content: `User asked: ${prompt}`,
            metadata: { type: 'question', timestamp: Date.now() },
          })
        }

        const refinedPrompt = context
          ? `${context}\nUser request: ${prompt}`
          : prompt

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                originalPrompt: prompt,
                refinedPrompt,
                memoriesUsed: memories.length,
                memories: memories.map((m) => m.text),
              }),
            },
          ],
        }
      }

      case 'store_conversation': {
        const { userId, question, answer, metadata = {} } = args as {
          userId: string
          question: string
          answer: string
          metadata?: Record<string, any>
        }

        // Store both the question and answer as separate memories
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                memoryIds,
                stored: 'conversation',
              }),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    }
  }
})

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'memory://recent',
        name: 'Recent Memories',
        description: 'Access recently stored memories',
        mimeType: 'application/json',
      },
    ],
  }
})

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === 'memory://recent') {
    // This is a simplified example - you'd need to track recent memories
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: 'Use search_memories tool to query memories',
          }),
        },
      ],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.error('🤖 Memory Context MCP Server running on stdio')
  console.error('')
  console.error('To use this server in VS Code, add to .vscode/mcp.json:')
  console.error('')
  console.error(JSON.stringify({
    servers: {
      'memories-mcp': {
        command: 'npm',
        args: ['run', 'mcp'],
        cwd: process.cwd(),
        type: 'stdio'
      }
    }
  }, null, 2))
  console.error('')
  console.error('Available MCP Tools:')
  console.error('  • mcp_memories-mcp_search_memories')
  console.error('  • mcp_memories-mcp_add_memory')
  console.error('  • mcp_memories-mcp_get_memory_stats')
  console.error('  • mcp_memories-mcp_refine_prompt_with_memories')
  console.error('  • mcp_memories-mcp_store_conversation')
  console.error('')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
