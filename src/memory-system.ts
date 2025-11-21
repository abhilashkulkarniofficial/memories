import ollama from 'ollama'
import { randomUUID } from 'crypto'
import { VectorStore } from './vector-store.js'
import { chunkText, normalizeText, extractMetadata } from './chunking.js'

export interface MemoryConfig {
  embeddingModel?: string
  chatModel?: string
  maxChunkTokens?: number
  overlapTokens?: number
  qdrantUrl?: string
}

export interface AddMemoryOptions {
  userId: string
  content: string
  metadata?: Record<string, any>
}

export interface SearchMemoryOptions {
  userId: string
  query: string
  limit?: number
  scoreThreshold?: number
}

export interface ChatOptions {
  userId: string
  message: string
  systemPrompt?: string
  includeMemoryContext?: boolean
  maxContextMemories?: number
}

export class MemorySystem {
  private vectorStore: VectorStore
  private config: Required<MemoryConfig>

  constructor(config: MemoryConfig = {}) {
    this.config = {
      embeddingModel: config.embeddingModel || 'nomic-embed-text',
      chatModel: config.chatModel || 'llama3.2',
      maxChunkTokens: config.maxChunkTokens || 500,
      overlapTokens: config.overlapTokens || 50,
      qdrantUrl: config.qdrantUrl || 'http://localhost:6333',
    }
    this.vectorStore = new VectorStore(this.config.qdrantUrl)
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    console.log('Initializing memory system...')
    await this.vectorStore.initialize()
    console.log('Memory system initialized')
  }

  /**
   * Generate embedding for text using local Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ollama.embeddings({
        model: this.config.embeddingModel,
        prompt: text,
      })
      return response.embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error(
        `Failed to generate embedding. Is Ollama running with ${this.config.embeddingModel} model?`
      )
    }
  }

  /**
   * Add memory to the system
   */
  async addMemory(options: AddMemoryOptions): Promise<string[]> {
    const { userId, content, metadata = {} } = options

    // Normalize and chunk the content
    const normalized = normalizeText(content)
    const chunks = chunkText(
      normalized,
      this.config.maxChunkTokens,
      this.config.overlapTokens
    )

    console.log(`Adding ${chunks.length} memory chunks for user ${userId}`)

    const memoryIds: string[] = []

    // Process each chunk
    for (const chunk of chunks) {
      const id = randomUUID()
      const embedding = await this.generateEmbedding(chunk.text)
      const chunkMetadata = {
        ...metadata,
        ...extractMetadata(chunk.text),
        chunkIndex: chunk.index,
        totalChunks: chunks.length,
      }

      await this.vectorStore.addMemory(id, embedding, {
        text: chunk.text,
        userId,
        timestamp: Date.now(),
        metadata: chunkMetadata,
      })

      memoryIds.push(id)
    }

    console.log(`Successfully added ${memoryIds.length} memories`)
    return memoryIds
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(options: SearchMemoryOptions) {
    const { userId, query, limit = 5, scoreThreshold = 0.5 } = options

    console.log(`Searching memories for user ${userId}: "${query}"`)

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query)

    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding,
      userId,
      limit,
      scoreThreshold
    )

    console.log(`Found ${results.length} relevant memories`)
    return results
  }

  /**
   * Chat with LLM using memory context
   */
  async chat(options: ChatOptions) {
    const {
      userId,
      message,
      systemPrompt = 'You are a helpful AI assistant with access to the user\'s memories.',
      includeMemoryContext = true,
      maxContextMemories = 5,
    } = options

    let contextPrompt = systemPrompt

    // Add memory context if enabled
    if (includeMemoryContext) {
      const memories = await this.searchMemories({
        userId,
        query: message,
        limit: maxContextMemories,
      })

      if (memories.length > 0) {
        const memoryContext = memories
          .map(
            (m, i) =>
              `[Memory ${i + 1}] (relevance: ${(m.score * 100).toFixed(1)}%)\n${m.text}`
          )
          .join('\n\n')

        contextPrompt += `\n\n### Relevant memories from past conversations:\n${memoryContext}\n\n### Use this context to provide a more personalized response.`
      }
    }

    console.log(`Chatting with ${this.config.chatModel}...`)

    // Call Ollama for chat completion
    const response = await ollama.chat({
      model: this.config.chatModel,
      messages: [
        {
          role: 'system',
          content: contextPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      stream: false,
    })

    return {
      response: response.message.content,
      memoriesUsed: includeMemoryContext ? maxContextMemories : 0,
    }
  }

  /**
   * Stream chat responses
   */
  async *chatStream(options: ChatOptions): AsyncGenerator<string> {
    const {
      userId,
      message,
      systemPrompt = 'You are a helpful AI assistant with access to the user\'s memories.',
      includeMemoryContext = true,
      maxContextMemories = 5,
    } = options

    let contextPrompt = systemPrompt

    // Add memory context if enabled
    if (includeMemoryContext) {
      const memories = await this.searchMemories({
        userId,
        query: message,
        limit: maxContextMemories,
      })

      if (memories.length > 0) {
        const memoryContext = memories
          .map(
            (m, i) =>
              `[Memory ${i + 1}] (relevance: ${(m.score * 100).toFixed(1)}%)\n${m.text}`
          )
          .join('\n\n')

        contextPrompt += `\n\n### Relevant memories from past conversations:\n${memoryContext}\n\n### Use this context to provide a more personalized response.`
      }
    }

    // Stream response from Ollama
    const stream = await ollama.chat({
      model: this.config.chatModel,
      messages: [
        {
          role: 'system',
          content: contextPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      yield chunk.message.content
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(id: string): Promise<void> {
    await this.vectorStore.deleteMemory(id)
  }

  /**
   * Delete all memories for a user
   */
  async deleteUserMemories(userId: string): Promise<void> {
    await this.vectorStore.deleteUserMemories(userId)
  }

  /**
   * Get memory count
   */
  async getMemoryCount(userId?: string): Promise<number> {
    return this.vectorStore.getCount(userId)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    qdrant: boolean
    ollama: boolean
  }> {
    const qdrantHealthy = await this.vectorStore.healthCheck()

    let ollamaHealthy = false
    try {
      await ollama.list()
      ollamaHealthy = true
    } catch {
      ollamaHealthy = false
    }

    return {
      qdrant: qdrantHealthy,
      ollama: ollamaHealthy,
    }
  }
}
