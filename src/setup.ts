import { MemorySystem } from './memory-system.js'

console.log('Setting up memory system...\n')

async function setup() {
  const memorySystem = new MemorySystem()

  try {
    // Initialize
    await memorySystem.initialize()

    // Check health
    const health = await memorySystem.healthCheck()
    console.log('Health Check:')
    console.log(`  ✓ Qdrant: ${health.qdrant ? 'Connected' : 'Failed'}`)
    console.log(`  ✓ Ollama: ${health.ollama ? 'Connected' : 'Failed'}`)

    if (!health.qdrant) {
      console.log(
        '\n⚠️  Qdrant is not running. Start it with: npm run docker:up'
      )
    }

    if (!health.ollama) {
      console.log(
        '\n⚠️  Ollama is not running. Install and start it from: https://ollama.ai'
      )
    }

    if (health.qdrant && health.ollama) {
      console.log('\n✅ System is ready!')
      console.log('\nNext steps:')
      console.log('  1. Add memories: npm run cli add -u user123 -c "Your content"')
      console.log('  2. Search: npm run cli search -u user123 -q "query"')
      console.log('  3. Chat: npm run cli chat -u user123 -m "Hello"')
      console.log('  4. Start server: npm run dev')
    }
  } catch (error) {
    console.error('Setup error:', error)
    process.exit(1)
  }
}

setup()
