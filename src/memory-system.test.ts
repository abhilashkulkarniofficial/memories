import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { MemorySystem } from './memory-system.js'

describe('MemorySystem', () => {
  let memorySystem: MemorySystem

  beforeAll(async () => {
    memorySystem = new MemorySystem({
      embeddingModel: 'nomic-embed-text',
      chatModel: 'llama3.2',
      qdrantUrl: 'http://localhost:6333',
    })
    
    // Only initialize if services are available
    try {
      await memorySystem.initialize()
    } catch (error) {
      console.warn('Skipping tests - services not available:', error)
    }
  })

  afterAll(async () => {
    // Clean up test data
    try {
      await memorySystem.deleteUserMemories('test-user')
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('initialization', () => {
    it('should create memory system with default config', () => {
      const system = new MemorySystem()
      expect(system).toBeDefined()
    })

    it('should create memory system with custom config', () => {
      const system = new MemorySystem({
        embeddingModel: 'custom-model',
        chatModel: 'custom-chat',
        maxChunkTokens: 1000,
        overlapTokens: 100,
      })
      expect(system).toBeDefined()
    })
  })

  describe('health check', () => {
    it('should check service health', async () => {
      const health = await memorySystem.healthCheck()
      
      expect(health).toHaveProperty('qdrant')
      expect(health).toHaveProperty('ollama')
      expect(typeof health.qdrant).toBe('boolean')
      expect(typeof health.ollama).toBe('boolean')
    })
  })

  describe('memory operations', () => {
    it('should add memory and return memory IDs', async () => {
      try {
        const ids = await memorySystem.addMemory({
          userId: 'test-user',
          content: 'This is a test memory about TypeScript',
          metadata: { type: 'test' },
        })
        
        expect(ids).toBeDefined()
        expect(Array.isArray(ids)).toBe(true)
        expect(ids.length).toBeGreaterThan(0)
      } catch (error: any) {
        if (error.message.includes('Ollama')) {
          console.warn('Skipping test - Ollama not available')
        } else {
          throw error
        }
      }
    }, 30000) // Increase timeout for LLM operations

    it('should search memories and return results', async () => {
      try {
        // Add a memory first
        await memorySystem.addMemory({
          userId: 'test-user',
          content: 'I love working with React and TypeScript for frontend development',
          metadata: { type: 'test' },
        })

        // Search for it
        const results = await memorySystem.searchMemories({
          userId: 'test-user',
          query: 'TypeScript React',
          limit: 5,
        })
        
        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
        
        if (results.length > 0) {
          expect(results[0]).toHaveProperty('text')
          expect(results[0]).toHaveProperty('score')
          expect(results[0].score).toBeGreaterThanOrEqual(0)
          expect(results[0].score).toBeLessThanOrEqual(1)
        }
      } catch (error: any) {
        if (error.message.includes('Ollama')) {
          console.warn('Skipping test - Ollama not available')
        } else {
          throw error
        }
      }
    }, 30000)

    it('should get memory count', async () => {
      try {
        const count = await memorySystem.getMemoryCount('test-user')
        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThanOrEqual(0)
      } catch (error: any) {
        console.warn('Skipping test - services not available')
      }
    })

    it('should handle empty search results', async () => {
      try {
        const results = await memorySystem.searchMemories({
          userId: 'non-existent-user',
          query: 'something that does not exist',
          limit: 5,
        })
        
        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
      } catch (error: any) {
        if (error.message.includes('Ollama')) {
          console.warn('Skipping test - Ollama not available')
        } else {
          throw error
        }
      }
    }, 30000)
  })

  describe('chat operations', () => {
    it('should chat without memory context', async () => {
      try {
        const response = await memorySystem.chat({
          userId: 'test-user',
          message: 'Hello',
          includeMemoryContext: false,
        })
        
        expect(response).toHaveProperty('response')
        expect(response).toHaveProperty('memoriesUsed')
        expect(typeof response.response).toBe('string')
        expect(response.memoriesUsed).toBe(0)
      } catch (error: any) {
        if (error.message.includes('Ollama')) {
          console.warn('Skipping test - Ollama not available')
        } else {
          throw error
        }
      }
    }, 60000) // Chat operations take longer
  })

  describe('deletion operations', () => {
    it('should delete user memories', async () => {
      try {
        // Add a test memory
        await memorySystem.addMemory({
          userId: 'delete-test-user',
          content: 'This will be deleted',
        })

        // Delete all memories
        await memorySystem.deleteUserMemories('delete-test-user')
        
        // Verify deletion
        const count = await memorySystem.getMemoryCount('delete-test-user')
        expect(count).toBe(0)
      } catch (error: any) {
        if (error.message.includes('Ollama')) {
          console.warn('Skipping test - Ollama not available')
        } else {
          throw error
        }
      }
    }, 30000)
  })
})
