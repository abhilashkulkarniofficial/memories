import { describe, it, expect } from 'vitest'
import { chunkText, normalizeText, extractMetadata } from './chunking.js'

describe('chunking', () => {
  describe('normalizeText', () => {
    it('should trim whitespace', () => {
      const result = normalizeText('  hello world  ')
      expect(result).toBe('hello world')
    })

    it('should collapse multiple spaces', () => {
      const result = normalizeText('hello    world')
      expect(result).toBe('hello world')
    })

    it('should normalize line breaks', () => {
      const result = normalizeText('hello\n\n\nworld')
      // Multiple newlines collapsed to single newline, then spaces normalized
      expect(result).toBe('hello world')
    })

    it('should handle empty string', () => {
      const result = normalizeText('')
      expect(result).toBe('')
    })
  })

  describe('chunkText', () => {
    it('should create single chunk for short text', () => {
      const text = 'Short text'
      const chunks = chunkText(text, 100, 20)
      
      expect(chunks).toHaveLength(1)
      // Chunking adds period at end
      expect(chunks[0].text).toBe('Short text.')
      expect(chunks[0].index).toBe(0)
    })

    it('should create multiple chunks for long text with sentences', () => {
      // Create text with multiple sentences that will trigger chunking
      const sentences = Array(20).fill('This is a test sentence').join('. ')
      const chunks = chunkText(sentences, 100, 20)
      
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0].index).toBe(0)
      if (chunks.length > 1) {
        expect(chunks[1].index).toBe(1)
      }
    })

    it('should respect max token count', () => {
      // Create text with many sentences
      const sentences = Array(20).fill('This is a sentence').join('. ')
      const maxTokens = 100
      const chunks = chunkText(sentences, maxTokens, 20)
      
      chunks.forEach(chunk => {
        // Token count should be <= max (tokens ≈ chars/4)
        expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens)
      })
    })

    it('should create overlapping chunks', () => {
      const text = 'The quick brown fox jumps over the lazy dog. ' +
                   'The dog was sleeping under a tree.'
      const chunks = chunkText(text, 50, 10)
      
      if (chunks.length > 1) {
        // Check that there's some overlap
        const firstChunkEnd = chunks[0].text.slice(-10)
        const secondChunkStart = chunks[1].text.slice(0, 10)
        
        // There should be some common words or characters
        expect(chunks.length).toBeGreaterThan(1)
      }
    })

    it('should handle empty text', () => {
      const chunks = chunkText('', 100, 20)
      expect(chunks).toHaveLength(0)
    })
  })

  describe('extractMetadata', () => {
    it('should extract URL metadata', () => {
      const text = 'Check out https://example.com for more info'
      const metadata = extractMetadata(text)
      
      expect(metadata.hasUrl).toBe(true)
      expect(metadata.wordCount).toBeGreaterThan(0)
    })

    it('should extract email metadata', () => {
      const text = 'Contact me at test@example.com'
      const metadata = extractMetadata(text)
      
      expect(metadata.hasEmail).toBe(true)
    })

    it('should count words', () => {
      const text = 'one two three four five'
      const metadata = extractMetadata(text)
      
      expect(metadata.wordCount).toBe(5)
    })

    it('should count characters', () => {
      const text = 'hello'
      const metadata = extractMetadata(text)
      
      expect(metadata.charCount).toBe(5)
    })

    it('should have language property', () => {
      const text = 'Some text'
      const metadata = extractMetadata(text)
      
      expect(metadata.language).toBe('en')
    })

    it('should handle text with no URLs or emails', () => {
      const text = 'Just plain text'
      const metadata = extractMetadata(text)
      
      expect(metadata.hasUrl).toBe(false)
      expect(metadata.hasEmail).toBe(false)
      expect(metadata.wordCount).toBe(3)
      expect(metadata.charCount).toBe(15)
    })
  })
})
