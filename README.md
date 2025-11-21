# GitHub Copilot Memory System

A local memory system that enhances GitHub Copilot with persistent context about your project, preferences, and decisions.

## Features

- 🤖 **GitHub Copilot Integration** - Automatic context injection into Copilot chats
- 🧠 **Semantic Memory** - Vector-based similarity search
- ✅ **100% Local** - No cloud services, all data stays on your machine
- � **HTTP & Stdio MCP** - Multiple integration methods
- 📊 **CLI Tools** - Manage memories from command line

## Prerequisites

### 1. Install Podman (Vector Database Container)

**macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install podman

# Fedora
sudo dnf install podman

# Arch Linux
sudo pacman -S podman
```

**Windows:**
```bash
# Using winget
winget install -e --id RedHat.Podman
```

### 2. Install Ollama (Local LLM Embeddings)

**macOS:**
```bash
brew install ollama
ollama serve  # Start the service
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve  # Start the service
```

**Windows:**
Download from [ollama.ai](https://ollama.ai) or:
```bash
winget install -e --id Ollama.Ollama
```

### 3. Pull Required Model

```bash
ollama pull nomic-embed-text
```

## Setup & Running MCP Server

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Services

```bash
# Start Qdrant vector database
npm run podman:up

# Start MCP HTTP Server (port 3000)
npm run mcp:http
```

**Or start Copilot API server (port 3001):**
```bash
npm start
```

### 3. Verify Services

```bash
# Check MCP server
curl http://localhost:3000/health

# Check Qdrant
curl http://localhost:6333/collections
```

## VS Code Setup

### 1. Configure Copilot Instructions

Copy `.github/copilot-instructions.md` file to your repository.

### 2. Keep MCP Server Running

```bash
npm run mcp:http
```

That's it! Copilot will now:
- Search your memories before responding
- Store conversations automatically
- Use project-specific context in answers

### 3. Test the Integration

Store some context:
```bash
npm run cli -- add -u developer -c "We use React with TypeScript"
npm run cli -- add -u developer -c "API follows REST conventions"
```

Ask GitHub Copilot: **"What frontend framework do we use?"**

Copilot should mention React based on your stored memory!

## CLI Examples

### Store Memories

```bash
# Add architectural decisions
npm run cli -- add -u developer -c "Authentication uses JWT with refresh tokens"
npm run cli -- add -u developer -c "Database is PostgreSQL with Prisma ORM"
npm run cli -- add -u developer -c "Error handling uses custom AppError class"
```

### Search Memories

```bash
# Search for specific topics
npm run cli -- search -u developer -q "authentication JWT" -l 5

# Search for preferences
npm run cli -- search -u developer -q "frontend React components"
```

### View Statistics

```bash
# Get memory count
npm run cli -- stats -u developer
```

### Chat with Memory Context

```bash
# Ask questions with context
npm run cli -- chat -u developer -m "How should I implement authentication?"
```

### Delete Memories

```bash
# Delete specific memory by ID
npm run cli -- delete -i <memory-id>

# Delete all memories for a user
npm run cli -- delete-user -u developer
```

## Available Scripts

```bash
npm run mcp:http       # Start MCP HTTP server (port 3000)
npm start              # Start Copilot API server (port 3001)
npm run cli            # Run CLI commands
npm run podman:up      # Start Qdrant database
npm run podman:down    # Stop Qdrant database
```

## Configuration

Environment variables (optional):

```bash
QDRANT_URL=http://localhost:6333
EMBEDDING_MODEL=nomic-embed-text
MCP_PORT=3000
COPILOT_PORT=3001
```

## Troubleshooting

**MCP server not responding:**
```bash
curl http://localhost:3000/health
lsof -i :3000  # Check what's using port 3000
npm run mcp:http  # Restart
```

**Qdrant connection failed:**
```bash
npm run podman:up
curl http://localhost:6333/collections
```

**Ollama not found:**
```bash
ollama serve
ollama pull nomic-embed-text
```

**Copilot not using memories:**
1. Verify `.github/copilot-instructions.md` exists
2. Check VS Code settings reference the file
3. Restart VS Code
4. Ensure MCP server is running

## Privacy & Security

✅ **100% Local** - All data stays on your machine  
✅ **No telemetry** - No tracking or analytics  
✅ **Open source** - Full code transparency  
✅ **Offline capable** - Works without internet

## License

MIT
