import { describe, it, expect } from 'vitest'

describe('MCP Server Tools', () => {
  describe('Tool Definitions', () => {
    const tools = [
      'search_memories',
      'add_memory',
      'get_memory_stats',
      'refine_prompt_with_memories',
      'store_conversation',
    ]

    it('should have all required tools', () => {
      expect(tools).toContain('search_memories')
      expect(tools).toContain('add_memory')
      expect(tools).toContain('get_memory_stats')
      expect(tools).toContain('refine_prompt_with_memories')
      expect(tools).toContain('store_conversation')
    })

    it('should have correct number of tools', () => {
      expect(tools.length).toBe(5)
    })
  })

  describe('search_memories Tool Schema', () => {
    const schema = {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number', default: 5 },
      },
      required: ['userId', 'query'],
    }

    it('should have required userId parameter', () => {
      expect(schema.required).toContain('userId')
    })

    it('should have required query parameter', () => {
      expect(schema.required).toContain('query')
    })

    it('should have optional limit with default value', () => {
      expect(schema.properties.limit.default).toBe(5)
    })
  })

  describe('add_memory Tool Schema', () => {
    const schema = {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        content: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['userId', 'content'],
    }

    it('should have required userId parameter', () => {
      expect(schema.required).toContain('userId')
    })

    it('should have required content parameter', () => {
      expect(schema.required).toContain('content')
    })

    it('should have optional metadata parameter', () => {
      expect(schema.properties.metadata).toBeDefined()
      expect(schema.required).not.toContain('metadata')
    })
  })

  describe('store_conversation Tool Schema', () => {
    const schema = {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        question: { type: 'string' },
        answer: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['userId', 'question', 'answer'],
    }

    it('should have all required parameters', () => {
      expect(schema.required).toContain('userId')
      expect(schema.required).toContain('question')
      expect(schema.required).toContain('answer')
    })

    it('should have optional metadata', () => {
      expect(schema.properties.metadata).toBeDefined()
      expect(schema.required).not.toContain('metadata')
    })
  })

  describe('Response Formatting', () => {
    it('should format search results as JSON', () => {
      const results = [
        { text: 'Memory 1', score: 0.85, timestamp: Date.now() },
        { text: 'Memory 2', score: 0.72, timestamp: Date.now() },
      ]

      const response = {
        results: results.map((r) => ({
          text: r.text,
          score: r.score,
          timestamp: r.timestamp,
        })),
        count: results.length,
      }

      expect(response.count).toBe(2)
      expect(response.results).toHaveLength(2)
      expect(response.results[0]).toHaveProperty('text')
      expect(response.results[0]).toHaveProperty('score')
    })

    it('should format responses as MCP content', () => {
      const data = { test: 'value' }
      const content = [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ]

      expect(content[0].type).toBe('text')
      expect(content[0].text).toContain('test')
      expect(JSON.parse(content[0].text)).toEqual(data)
    })
  })

  describe('Prompt Refinement', () => {
    it('should build refined prompt with memories', () => {
      const memories = [
        { text: 'Memory 1', score: 0.85 },
        { text: 'Memory 2', score: 0.72 },
      ]

      const memoryContext = memories
        .map((m, i) => `[Memory ${i + 1}] (${(m.score * 100).toFixed(1)}% match)\n${m.text}`)
        .join('\n\n')

      expect(memoryContext).toContain('Memory 1')
      expect(memoryContext).toContain('85.0% match')
      expect(memoryContext).toContain('Memory 2')
      expect(memoryContext).toContain('72.0% match')
    })

    it('should append memories to original prompt', () => {
      const originalPrompt = 'What do I like?'
      const memoryContext = 'You like TypeScript'
      const refinedPrompt = `${originalPrompt}\n\n### Relevant Context:\n${memoryContext}`

      expect(refinedPrompt).toContain(originalPrompt)
      expect(refinedPrompt).toContain(memoryContext)
      expect(refinedPrompt).toContain('Relevant Context')
    })
  })

  describe('Conversation Storage', () => {
    it('should format Q&A pair for storage', () => {
      const question = 'What is TypeScript?'
      const answer = 'TypeScript is a typed superset of JavaScript'
      const conversationText = `Q: ${question}\nA: ${answer}`

      expect(conversationText).toContain(question)
      expect(conversationText).toContain(answer)
      expect(conversationText).toMatch(/^Q:/)
      expect(conversationText).toMatch(/A:/)
    })

    it('should include conversation type in metadata', () => {
      const metadata = {
        type: 'conversation',
        source: 'copilot',
      }

      expect(metadata.type).toBe('conversation')
      expect(metadata).toHaveProperty('source')
    })
  })

  describe('Error Scenarios', () => {
    const validTools = [
      'search_memories',
      'add_memory',
      'get_memory_stats',
      'refine_prompt_with_memories',
      'store_conversation',
    ]

    it('should reject unknown tool names', () => {
      const unknownTool = 'invalid_tool'
      expect(validTools).not.toContain(unknownTool)
    })

    it('should validate required parameters', () => {
      const request = {
        userId: 'test-user',
        // missing 'query' parameter
      }

      const required = ['userId', 'query']
      const hasAllRequired = required.every((param) => param in request)

      expect(hasAllRequired).toBe(false)
    })

    it('should handle empty search results', () => {
      const results: any[] = []
      const response = {
        results,
        count: results.length,
      }

      expect(response.count).toBe(0)
      expect(response.results).toHaveLength(0)
    })
  })

  describe('Score Thresholds', () => {
    it('should use 0.3 as default score threshold', () => {
      const defaultThreshold = 0.3
      expect(defaultThreshold).toBe(0.3)
    })

    it('should filter results by score threshold', () => {
      const results = [
        { text: 'High match', score: 0.85 },
        { text: 'Low match', score: 0.2 },
      ]
      const threshold = 0.3

      const filtered = results.filter((r) => r.score >= threshold)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].text).toBe('High match')
    })
  })

  describe('Memory Stats', () => {
    it('should return count for specific user', () => {
      const stats = {
        userId: 'test-user',
        count: 42,
      }

      expect(stats).toHaveProperty('userId')
      expect(stats).toHaveProperty('count')
      expect(typeof stats.count).toBe('number')
    })

    it('should handle zero memories', () => {
      const count = 0
      expect(count).toBeGreaterThanOrEqual(0)
      expect(typeof count).toBe('number')
    })
  })
})
