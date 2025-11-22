#!/usr/bin/env node
/**
 * Unified MCP Server Entry Point
 * 
 * Allows running either HTTP or stdio-based MCP server
 * Usage:
 *   npm start              # HTTP server (default)
 *   npm start -- --stdio   # stdio server
 *   npm start -- --http    # HTTP server (explicit)
 */

async function main() {
  const args = process.argv.slice(2)
  const mode = args.includes('--http') ? 'http' : 'stdio'

  console.log(`🚀 Starting MCP Server in ${mode.toUpperCase()} mode...\n`)

  if (mode === 'stdio') {
    // Start stdio-based MCP server
    await import('./mcp-server.js')
  } else {
    // Start HTTP-based MCP server
    await import('./mcp-http-server.js')
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

export {}
