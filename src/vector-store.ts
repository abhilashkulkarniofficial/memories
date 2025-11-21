import { QdrantClient } from '@qdrant/js-client-rest'

const COLLECTION_NAME = 'memories'
const VECTOR_SIZE = 768 // nomic-embed-text dimension

export class VectorStore {
  private client: QdrantClient

  constructor(url: string = 'http://localhost:6333') {
    this.client = new QdrantClient({ url })
  }

  /**
   * Initialize the vector store and create collection if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(
        (c) => c.name === COLLECTION_NAME
      )

      if (!exists) {
        console.log(`Creating collection: ${COLLECTION_NAME}`)
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        })
        console.log('Collection created successfully')
      } else {
        console.log('Collection already exists')
      }
    } catch (error) {
      console.error('Error initializing vector store:', error)
      throw error
    }
  }

  /**
   * Add a memory with its embedding to the vector store
   */
  async addMemory(
    id: string,
    embedding: number[],
    payload: {
      text: string
      userId: string
      timestamp: number
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload,
        },
      ],
    })
  }

  /**
   * Search for similar memories using vector similarity
   */
  async search(
    embedding: number[],
    userId: string,
    limit: number = 5,
    scoreThreshold: number = 0.5
  ): Promise<Array<{
    id: string
    score: number
    text: string
    timestamp: number
    metadata?: Record<string, any>
  }>> {
    const results = await this.client.search(COLLECTION_NAME, {
      vector: embedding,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    })

    return results.map((result) => ({
      id: result.id as string,
      score: result.score,
      text: result.payload?.text as string,
      timestamp: result.payload?.timestamp as number,
      metadata: result.payload?.metadata as Record<string, any> | undefined,
    }))
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string): Promise<void> {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      points: [id],
    })
  }

  /**
   * Delete all memories for a user
   */
  async deleteUserMemories(userId: string): Promise<void> {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
    })
  }

  /**
   * Get total count of memories
   */
  async getCount(userId?: string): Promise<number> {
    const filter = userId
      ? {
          must: [
            {
              key: 'userId',
              match: { value: userId },
            },
          ],
        }
      : undefined

    const result = await this.client.count(COLLECTION_NAME, {
      filter,
      exact: true,
    })

    return result.count
  }

  /**
   * Check if Qdrant is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections()
      return true
    } catch {
      return false
    }
  }
}
