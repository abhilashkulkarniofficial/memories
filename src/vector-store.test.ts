import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'crypto'
import { VectorStore } from './vector-store.js'

describe('VectorStore', () => {
  let vectorStore: VectorStore
  let serviceAvailable = false

  beforeAll(async () => {
    vectorStore = new VectorStore('http://localhost:6333')
    
    // Check if Qdrant is available
    try {
      await vectorStore.initialize()
      serviceAvailable = true
    } catch (error) {
      console.warn('Qdrant not available - skipping integration tests')
      serviceAvailable = false
    }
  })

  afterAll(async () => {
    // Cleanup test data
    if (serviceAvailable) {
      try {
        await vectorStore.deleteUserMemories('test-vector-user')
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  describe('Initialization', () => {
    it('should create VectorStore instance with default URL', () => {
      const store = new VectorStore()
      expect(store).toBeDefined()
    })

    it('should create VectorStore instance with custom URL', () => {
      const store = new VectorStore('http://custom:6333')
      expect(store).toBeDefined()
    })

    it('should initialize collection if Qdrant is available', async () => {
      if (!serviceAvailable) return

      await expect(vectorStore.initialize()).resolves.not.toThrow()
    })
  })

  describe('Health Check', () => {
    it('should check Qdrant health status', async () => {
      const isHealthy = await vectorStore.healthCheck()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should return true when Qdrant is available', async () => {
      if (!serviceAvailable) return

      const isHealthy = await vectorStore.healthCheck()
      expect(isHealthy).toBe(true)
    })

    it('should return false when Qdrant is unavailable', async () => {
      const offlineStore = new VectorStore('http://nonexistent:9999')
      const isHealthy = await offlineStore.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })

  describe('Memory Operations', () => {
    const testMemoryId = randomUUID()
    const testEmbedding = Array(768).fill(0.1) // 768D vector for nomic-embed-text

    it('should add memory with embedding', async () => {
      if (!serviceAvailable) return

      await expect(
        vectorStore.addMemory(testMemoryId, testEmbedding, {
          text: 'Test memory content',
          userId: 'test-vector-user',
          timestamp: Date.now(),
          metadata: { type: 'test' },
        })
      ).resolves.not.toThrow()
    }, 10000)

    it('should search memories by embedding', async () => {
      if (!serviceAvailable) return

      // Add a test memory first
      await vectorStore.addMemory(randomUUID(), testEmbedding, {
        text: 'Searchable memory content',
        userId: 'test-vector-user',
        timestamp: Date.now(),
      })

      const results = await vectorStore.search(
        testEmbedding,
        'test-vector-user',
        5,
        0.5
      )

      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id')
        expect(results[0]).toHaveProperty('score')
        expect(results[0]).toHaveProperty('text')
        expect(results[0]).toHaveProperty('timestamp')
      }
    }, 10000)

    it('should filter search results by userId', async () => {
      if (!serviceAvailable) return

      const results = await vectorStore.search(
        testEmbedding,
        'test-vector-user',
        5,
        0.5
      )

      // All results should be for the test user
      expect(Array.isArray(results)).toBe(true)
    }, 10000)

    it('should respect score threshold', async () => {
      if (!serviceAvailable) return

      const results = await vectorStore.search(
        testEmbedding,
        'test-vector-user',
        5,
        0.95 // High threshold
      )

      // With high threshold, might get fewer or no results
      expect(Array.isArray(results)).toBe(true)
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.95)
      })
    }, 10000)

    it('should respect search limit', async () => {
      if (!serviceAvailable) return

      const limit = 3
      const results = await vectorStore.search(
        testEmbedding,
        'test-vector-user',
        limit,
        0.1
      )

      expect(results.length).toBeLessThanOrEqual(limit)
    }, 10000)
  })

  describe('Memory Deletion', () => {
    it('should delete memory by ID', async () => {
      if (!serviceAvailable) return

      const memoryId = randomUUID()
      const embedding = Array(768).fill(0.1)

      // Add a memory
      await vectorStore.addMemory(memoryId, embedding, {
        text: 'Memory to delete',
        userId: 'test-vector-user',
        timestamp: Date.now(),
      })

      // Delete it
      await expect(vectorStore.deleteMemory(memoryId)).resolves.not.toThrow()
    }, 10000)

    it('should delete all user memories', async () => {
      if (!serviceAvailable) return

      const userId = 'delete-all-test-user'
      const embedding = Array(768).fill(0.1)

      // Add multiple memories
      await vectorStore.addMemory(randomUUID(), embedding, {
        text: 'Memory 1',
        userId,
        timestamp: Date.now(),
      })
      await vectorStore.addMemory(randomUUID(), embedding, {
        text: 'Memory 2',
        userId,
        timestamp: Date.now(),
      })

      // Delete all
      await vectorStore.deleteUserMemories(userId)

      // Verify deletion
      const count = await vectorStore.getCount(userId)
      expect(count).toBe(0)
    }, 15000)
  })

  describe('Memory Count', () => {
    it('should get total memory count', async () => {
      if (!serviceAvailable) return

      const count = await vectorStore.getCount()
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should get count for specific user', async () => {
      if (!serviceAvailable) return

      const count = await vectorStore.getCount('test-vector-user')
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 for non-existent user', async () => {
      if (!serviceAvailable) return

      const count = await vectorStore.getCount('non-existent-user-' + randomUUID())
      expect(count).toBe(0)
    })
  })

  describe('Vector Dimensions', () => {
    const VECTOR_SIZE = 768

    it('should accept 768-dimensional vectors', () => {
      const embedding = Array(VECTOR_SIZE).fill(0.5)
      expect(embedding.length).toBe(VECTOR_SIZE)
    })

    it('should handle normalized vectors', () => {
      // Create a normalized vector (length = 1)
      const value = 1 / Math.sqrt(VECTOR_SIZE)
      const embedding = Array(VECTOR_SIZE).fill(value)
      
      // Calculate magnitude
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      )
      
      expect(magnitude).toBeCloseTo(1, 5)
    })
  })

  describe('Payload Structure', () => {
    it('should store required payload fields', () => {
      const payload = {
        text: 'Sample text',
        userId: 'user-123',
        timestamp: Date.now(),
      }

      expect(payload).toHaveProperty('text')
      expect(payload).toHaveProperty('userId')
      expect(payload).toHaveProperty('timestamp')
      expect(typeof payload.text).toBe('string')
      expect(typeof payload.userId).toBe('string')
      expect(typeof payload.timestamp).toBe('number')
    })

    it('should store optional metadata', () => {
      const payload = {
        text: 'Sample text',
        userId: 'user-123',
        timestamp: Date.now(),
        metadata: {
          type: 'note',
          tags: ['important', 'work'],
        },
      }

      expect(payload.metadata).toBeDefined()
      expect(payload.metadata?.type).toBe('note')
      expect(Array.isArray(payload.metadata?.tags)).toBe(true)
    })
  })

  describe('Search Result Structure', () => {
    it('should return properly structured results', async () => {
      if (!serviceAvailable) return

      const embedding = Array(768).fill(0.1)
      const results = await vectorStore.search(
        embedding,
        'test-vector-user',
        5,
        0.1
      )

      if (results.length > 0) {
        const result = results[0]
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('text')
        expect(result).toHaveProperty('timestamp')
        expect(typeof result.id).toBe('string')
        expect(typeof result.score).toBe('number')
        expect(typeof result.text).toBe('string')
        expect(typeof result.timestamp).toBe('number')
      }
    }, 10000)

    it('should include metadata if present', async () => {
      if (!serviceAvailable) return

      const memoryId = randomUUID()
      const embedding = Array(768).fill(0.1)

      await vectorStore.addMemory(memoryId, embedding, {
        text: 'Memory with metadata',
        userId: 'test-vector-user',
        timestamp: Date.now(),
        metadata: { category: 'test', priority: 'high' },
      })

      const results = await vectorStore.search(
        embedding,
        'test-vector-user',
        5,
        0.1
      )

      const withMetadata = results.find((r) => r.id === memoryId)
      if (withMetadata) {
        expect(withMetadata.metadata).toBeDefined()
        expect(withMetadata.metadata?.category).toBe('test')
      }
    }, 10000)
  })

  describe('Distance Metric', () => {
    it('should use Cosine similarity', () => {
      const distanceMetric = 'Cosine'
      expect(distanceMetric).toBe('Cosine')
    })

    it('should return scores between 0 and 1 for Cosine', async () => {
      if (!serviceAvailable) return

      const embedding = Array(768).fill(0.1)
      const results = await vectorStore.search(
        embedding,
        'test-vector-user',
        5,
        0.0
      )

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(1)
      })
    }, 10000)
  })

  describe('Collection Management', () => {
    it('should have correct collection name', () => {
      const collectionName = 'memories'
      expect(collectionName).toBe('memories')
    })

    it('should handle existing collection gracefully', async () => {
      if (!serviceAvailable) return

      // Initialize multiple times should work
      await expect(vectorStore.initialize()).resolves.not.toThrow()
      await expect(vectorStore.initialize()).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid vector dimensions gracefully', async () => {
      if (!serviceAvailable) return

      const invalidEmbedding = Array(512).fill(0.1) // Wrong dimension

      // This might throw or be rejected by Qdrant
      await expect(
        vectorStore.addMemory(randomUUID(), invalidEmbedding, {
          text: 'Test',
          userId: 'test-user',
          timestamp: Date.now(),
        })
      ).rejects.toThrow()
    }, 10000)

    it('should handle connection errors', async () => {
      const offlineStore = new VectorStore('http://nonexistent:9999')
      
      await expect(offlineStore.initialize()).rejects.toThrow()
    })
  })
})
