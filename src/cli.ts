#!/usr/bin/env node
import { Command } from 'commander'
import { MemorySystem } from './memory-system.js'

const program = new Command()

program
  .name('memory-cli')
  .description('Local LLM Memory System CLI')
  .version('1.0.0')

// Initialize memory system
const memorySystem = new MemorySystem()

program
  .command('init')
  .description('Initialize the memory system')
  .action(async () => {
    try {
      console.log('Initializing memory system...')
      await memorySystem.initialize()
      console.log('✓ Memory system initialized successfully')
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('add')
  .description('Add a memory')
  .requiredOption('-u, --user <userId>', 'User ID')
  .requiredOption('-c, --content <content>', 'Memory content')
  .option('-m, --metadata <json>', 'Metadata as JSON string')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      const metadata = options.metadata ? JSON.parse(options.metadata) : {}

      console.log(`Adding memory for user: ${options.user}`)
      const memoryIds = await memorySystem.addMemory({
        userId: options.user,
        content: options.content,
        metadata,
      })

      console.log(`✓ Added ${memoryIds.length} memory chunks`)
      console.log('Memory IDs:', memoryIds)
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('search')
  .description('Search memories')
  .requiredOption('-u, --user <userId>', 'User ID')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-l, --limit <number>', 'Number of results', '5')
  .option('-t, --threshold <number>', 'Score threshold', '0.5')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      console.log(`Searching memories for user: ${options.user}`)
      console.log(`Query: "${options.query}"`)

      const results = await memorySystem.searchMemories({
        userId: options.user,
        query: options.query,
        limit: parseInt(options.limit),
        scoreThreshold: parseFloat(options.threshold),
      })

      console.log(`\nFound ${results.length} results:\n`)

      results.forEach((result, i) => {
        console.log(`[${i + 1}] Score: ${(result.score * 100).toFixed(1)}%`)
        console.log(`    ${result.text}`)
        console.log(`    (ID: ${result.id})`)
        console.log()
      })
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('chat')
  .description('Chat with memory context')
  .requiredOption('-u, --user <userId>', 'User ID')
  .requiredOption('-m, --message <message>', 'Your message')
  .option('--no-memory', 'Disable memory context')
  .option('-s, --stream', 'Enable streaming')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      console.log(`User: ${options.message}\n`)

      if (options.stream) {
        process.stdout.write('Assistant: ')
        const stream = memorySystem.chatStream({
          userId: options.user,
          message: options.message,
          includeMemoryContext: options.memory,
        })

        for await (const chunk of stream) {
          process.stdout.write(chunk)
        }
        console.log('\n')
      } else {
        const result = await memorySystem.chat({
          userId: options.user,
          message: options.message,
          includeMemoryContext: options.memory,
        })

        console.log(`Assistant: ${result.response}`)
        console.log(`\n(Used ${result.memoriesUsed} memories)`)
      }
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('delete')
  .description('Delete a memory')
  .requiredOption('-i, --id <id>', 'Memory ID')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      console.log(`Deleting memory: ${options.id}`)
      await memorySystem.deleteMemory(options.id)

      console.log('✓ Memory deleted')
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('delete-user')
  .description('Delete all memories for a user')
  .requiredOption('-u, --user <userId>', 'User ID')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      console.log(`Deleting all memories for user: ${options.user}`)
      await memorySystem.deleteUserMemories(options.user)

      console.log('✓ User memories deleted')
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('stats')
  .description('Get memory statistics')
  .option('-u, --user <userId>', 'User ID (optional)')
  .action(async (options) => {
    try {
      await memorySystem.initialize()

      const count = await memorySystem.getMemoryCount(options.user)

      if (options.user) {
        console.log(`User ${options.user} has ${count} memories`)
      } else {
        console.log(`Total memories: ${count}`)
      }
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('health')
  .description('Check system health')
  .action(async () => {
    try {
      await memorySystem.initialize()

      const health = await memorySystem.healthCheck()

      console.log('System Health:')
      console.log(`  Qdrant: ${health.qdrant ? '✓ Healthy' : '✗ Unhealthy'}`)
      console.log(`  Ollama: ${health.ollama ? '✓ Healthy' : '✗ Unhealthy'}`)

      if (!health.qdrant || !health.ollama) {
        process.exit(1)
      }
    } catch (error) {
      console.error('✗ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
