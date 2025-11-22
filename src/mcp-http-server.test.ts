import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('MCP HTTP Server API', () => {
  const BASE_URL = 'http://localhost:3000'
  let serverAvailable = false

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${BASE_URL}/health`)
      serverAvailable = response.ok
    } catch (error) {
      console.warn('MCP HTTP Server not running - skipping integration tests')
      serverAvailable = false
    }
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/health`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toBe('healthy')
      expect(data.server).toBe('MCP HTTP Server')
      expect(Array.isArray(data.tools)).toBe(true)
      expect(data.tools.length).toBeGreaterThan(0)
    })
  })

  describe('Tools Endpoint', () => {
    it('should list all available tools', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/tools`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.tools)).toBe(true)
      
      const toolNames = data.tools.map((t: any) => t.name)
      expect(toolNames).toContain('search_memories')
      expect(toolNames).toContain('add_memory')
      expect(toolNames).toContain('get_memory_stats')
    })
  })

  describe('Memory Operations', () => {
    const testUserId = 'test-integration-user'

    afterAll(async () => {
      // Cleanup test data
      if (serverAvailable) {
        try {
          await fetch(`${BASE_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tool: 'delete_user_memories',
              arguments: { userId: testUserId }
            })
          })
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    })

    it('should add memory via shortcut endpoint', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          content: 'Integration test memory about Vitest and testing'
        })
      })

      const data = await response.json()
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.result)).toBe(true)
    }, 30000)

    it('should search memories via shortcut endpoint', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          query: 'testing Vitest',
          limit: 5
        })
      })

      const data = await response.json()
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.result)).toBe(true)
    }, 30000)

    it('should get memory stats', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/stats/${testUserId}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(typeof data.result.count).toBe('number')
    })

    it('should execute tool via execute endpoint', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_memory_stats',
          arguments: { userId: testUserId }
        })
      })

      const data = await response.json()
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.result).toHaveProperty('count')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tool name', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'invalid_tool',
          arguments: {}
        })
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing required arguments', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'add_memory',
          arguments: {} // Missing userId and content
        })
      })

      expect(response.status).toBe(400)
    })
  })
})
