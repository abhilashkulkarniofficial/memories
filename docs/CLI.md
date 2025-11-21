# CLI Usage Guide

Complete guide to using the command-line interface for managing memories.

## Overview

The CLI provides commands for adding, searching, chatting with, and managing memories stored in your local vector database.

## Basic Syntax

```bash
npm run cli -- <command> [options]
```

## Available Commands

- `add` - Store new memories
- `search` - Search for memories
- `chat` - Chat with memory context
- `stats` - View memory statistics
- `delete` - Delete specific memory
- `delete-user` - Delete all memories for a user
- `health` - Check system health

## Command Examples

### 1. Add Memories

Store information that Copilot can reference later.

**Add architectural decisions:**
```bash
npm run cli -- add -u developer -c "Authentication uses JWT with refresh tokens"
npm run cli -- add -u developer -c "Database is PostgreSQL with Prisma ORM"
npm run cli -- add -u developer -c "Error handling uses custom AppError class"
```

**Add team preferences:**
```bash
npm run cli -- add -u team -c "Code reviews required for all PRs"
npm run cli -- add -u team -c "Use Prettier with 2-space indentation"
npm run cli -- add -u team -c "Testing with Vitest and Testing Library"
```

**Add API conventions:**
```bash
npm run cli -- add -u team -c "API endpoints follow /api/v1/{resource} pattern"
npm run cli -- add -u team -c "Use Zod for request validation"
npm run cli -- add -u team -c "Return 422 for validation errors"
```

**With metadata:**
```bash
npm run cli -- add -u developer -c "React component patterns" -m '{"category":"frontend","priority":"high"}'
```

### 2. Search Memories

Find relevant information from stored memories.

**Basic search:**
```bash
npm run cli -- search -u developer -q "authentication"
```

**Search with limit:**
```bash
npm run cli -- search -u developer -q "authentication JWT" -l 5
```

**Search for specific topics:**
```bash
# Frontend preferences
npm run cli -- search -u developer -q "frontend React components"

# Database information
npm run cli -- search -u developer -q "database PostgreSQL schema"

# Error handling
npm run cli -- search -u developer -q "error handling try catch"
```

**Search with score threshold:**
```bash
npm run cli -- search -u developer -q "testing" -l 10 --threshold 0.5
```

### 3. Chat with Context

Ask questions and get answers based on stored memories.

**Basic chat:**
```bash
npm run cli -- chat -u developer -m "How should I implement authentication?"
```

**Chat about architecture:**
```bash
npm run cli -- chat -u developer -m "What database are we using?"
npm run cli -- chat -u developer -m "How do we handle errors?"
npm run cli -- chat -u developer -m "What testing framework should I use?"
```

**Streaming responses:**
```bash
npm run cli -- chat -u developer -m "Explain our authentication flow" --stream
```

### 4. View Statistics

Check how many memories are stored.

**Get memory count:**
```bash
npm run cli -- stats -u developer
```

**Check for different users:**
```bash
npm run cli -- stats -u team
npm run cli -- stats -u personal
```

### 5. Delete Memories

Remove specific memories or all memories for a user.

**Delete specific memory:**
```bash
# First, search to get the ID
npm run cli -- search -u developer -q "old information"

# Then delete by ID
npm run cli -- delete -i 57e7d28a-97a5-43bf-9ffa-665d57d370db
```

**Delete all memories for a user:**
```bash
npm run cli -- delete-user -u developer
```

**⚠️ Warning:** This action cannot be undone!

### 6. Health Check

Verify that all services are running.

```bash
npm run cli -- health
```

Expected output:
```
✓ Qdrant is running
✓ Ollama is running
✓ Memory system is operational
```

## Command Options

### `add` Command

| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--user` | `-u` | User ID | Yes |
| `--content` | `-c` | Content to store | Yes |
| `--metadata` | `-m` | JSON metadata | No |

### `search` Command

| Option | Short | Description | Required | Default |
|--------|-------|-------------|----------|---------|
| `--user` | `-u` | User ID | Yes | - |
| `--query` | `-q` | Search query | Yes | - |
| `--limit` | `-l` | Max results | No | 5 |
| `--threshold` | `-t` | Min similarity score | No | 0.3 |

### `chat` Command

| Option | Short | Description | Required | Default |
|--------|-------|-------------|----------|---------|
| `--user` | `-u` | User ID | Yes | - |
| `--message` | `-m` | Your message | Yes | - |
| `--stream` | `-s` | Stream response | No | false |

### `stats` Command

| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--user` | `-u` | User ID | Yes |

### `delete` Command

| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--id` | `-i` | Memory ID to delete | Yes |

### `delete-user` Command

| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--user` | `-u` | User ID | Yes |

## Practical Workflows

### Workflow 1: New Project Setup

```bash
# Store technology stack
npm run cli -- add -u project -c "Stack: Next.js 14, TypeScript, Tailwind CSS, Prisma"
npm run cli -- add -u project -c "Authentication: NextAuth.js with Google OAuth"
npm run cli -- add -u project -c "Database: PostgreSQL on Railway"

# Verify stored
npm run cli -- stats -u project
```

### Workflow 2: Learning from Past Decisions

```bash
# Search past decisions
npm run cli -- search -u team -q "why we chose PostgreSQL" -l 3

# Chat to understand reasoning
npm run cli -- chat -u team -m "Why did we choose PostgreSQL over MongoDB?"
```

### Workflow 3: Onboarding New Team Member

```bash
# Search all conventions
npm run cli -- search -u team -q "coding standards conventions" -l 10
npm run cli -- search -u team -q "testing practices" -l 10
npm run cli -- search -u team -q "deployment process" -l 10
```

### Workflow 4: Cleanup Old Memories

```bash
# Find outdated information
npm run cli -- search -u developer -q "old deprecated" -l 20

# Delete specific outdated memory
npm run cli -- delete -i <memory-id>

# Or start fresh
npm run cli -- delete-user -u developer
```

## Tips & Best Practices

### Writing Good Memory Content

✅ **Do:**
- Be specific and descriptive
- Include context and reasoning
- Use consistent terminology
- Add relevant technical details
- Store decisions with rationale

❌ **Don't:**
- Be too vague ("We use React")
- Skip important details
- Use unclear abbreviations
- Store duplicate information
- Include sensitive data (passwords, keys)

### Search Query Tips

✅ **Good queries:**
- "authentication JWT tokens security"
- "React components hooks patterns"
- "database PostgreSQL migrations schema"

❌ **Poor queries:**
- "auth" (too short)
- "stuff" (too vague)
- "xyz" (no context)

### User ID Conventions

- `developer` - Personal development preferences
- `team` - Team-wide conventions and standards
- `project` - Project-specific architectural decisions
- `<username>` - Individual user preferences

## Troubleshooting

**Command not found:**
```bash
# Make sure you're in the project directory
cd /path/to/memories

# Check npm scripts
npm run
```

**Memory not found:**
```bash
# Check if memories exist
npm run cli -- stats -u developer

# Verify search query
npm run cli -- search -u developer -q "broader search terms" -l 10
```

**Connection errors:**
```bash
# Check services are running
npm run cli -- health

# Start Qdrant if needed
npm run podman:up

# Start Ollama if needed
ollama serve
```

**Empty search results:**
- Verify user ID matches what you used when adding
- Try broader search terms
- Lower the score threshold: `-t 0.2`
- Check if memories exist: `npm run cli -- stats -u <userId>`

## Advanced Usage

### Bulk Import

Create a script to import many memories:

```bash
#!/bin/bash

# import-memories.sh
while IFS='|' read -r content; do
  npm run cli -- add -u project -c "$content"
done < memories.txt
```

### Export Memories

Search and save results:

```bash
npm run cli -- search -u developer -q "all topics" -l 100 > exported-memories.txt
```

### Integration with Git Hooks

Store commit messages as memories:

```bash
# .git/hooks/post-commit
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)
npm run cli -- add -u git-history -c "Commit: $COMMIT_MSG"
```

## Next Steps

- Return to [main README](../README.md)
- Set up [VS Code integration](../README.md#vs-code-setup)
- Configure [GitHub Copilot](../README.md#vs-code-setup)

## Support

For CLI issues or questions, check:
- Main [README troubleshooting](../README.md#troubleshooting)
- [Installation guide](INSTALL.md) for service issues
