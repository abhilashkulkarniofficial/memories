/**
 * Intelligent text chunking utilities
 */

export interface Chunk {
  text: string
  index: number
  tokenCount: number
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting - can be enhanced with NLP libraries
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Chunk text into semantic pieces with overlap
 * @param text - The text to chunk
 * @param maxTokens - Maximum tokens per chunk (default: 500)
 * @param overlapTokens - Number of overlapping tokens between chunks (default: 50)
 */
export function chunkText(
  text: string,
  maxTokens: number = 500,
  overlapTokens: number = 50
): Chunk[] {
  const sentences = splitIntoSentences(text)
  const chunks: Chunk[] = []
  let currentChunk: string[] = []
  let currentTokenCount = 0
  let chunkIndex = 0

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence)

    // If adding this sentence exceeds max tokens, save current chunk
    if (
      currentTokenCount + sentenceTokens > maxTokens &&
      currentChunk.length > 0
    ) {
      const chunkText = currentChunk.join('. ') + '.'
      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        tokenCount: currentTokenCount,
      })

      // Create overlap by keeping last few sentences
      const overlapSentences: string[] = []
      let overlapCount = 0
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const tokens = estimateTokenCount(currentChunk[i]!)
        if (overlapCount + tokens <= overlapTokens) {
          overlapSentences.unshift(currentChunk[i]!)
          overlapCount += tokens
        } else {
          break
        }
      }

      currentChunk = overlapSentences
      currentTokenCount = overlapCount
    }

    currentChunk.push(sentence)
    currentTokenCount += sentenceTokens
  }

  // Add the last chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('. ') + '.'
    chunks.push({
      text: chunkText,
      index: chunkIndex,
      tokenCount: currentTokenCount,
    })
  }

  return chunks
}

/**
 * Clean and normalize text
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim()
}

/**
 * Extract metadata from text (simple implementation)
 */
export function extractMetadata(text: string): Record<string, any> {
  const wordCount = text.split(/\s+/).length
  const charCount = text.length
  const hasUrl = /https?:\/\/[^\s]+/.test(text)
  const hasEmail = /[^\s]+@[^\s]+\.[^\s]+/.test(text)

  return {
    wordCount,
    charCount,
    hasUrl,
    hasEmail,
    language: 'en', // Could add language detection
  }
}
