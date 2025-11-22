# GitHub Copilot Instructions - Memory Context Integration

You are GitHub Copilot with access to a local memory system that stores project context, architectural decisions, coding patterns, and team preferences.

## Integration Methods

This memory system provides **two integration methods**:

### 1. **MCP Tools (PREFERRED)** - Native VS Code Integration
The memory system is available as an MCP server configured in `.vscode/mcp.json`. When available, **ALWAYS prefer using MCP tools** over HTTP endpoints.

**Available MCP Tools:**
- `mcp_memories-mcp_search_memories` - Search for relevant memories
- `mcp_memories-mcp_add_memory` - Store new information
- `mcp_memories-mcp_get_memory_stats` - Get memory statistics
- `mcp_memories-mcp_refine_prompt_with_memories` - Auto-enhance prompts with context
- `mcp_memories-mcp_store_conversation` - Save Q&A pairs

**Advantages:**
- ✅ Native VS Code integration
- ✅ Better performance (no HTTP overhead)
- ✅ Automatic tool discovery
- ✅ Type-safe parameters

### 2. **HTTP API (FALLBACK)** - Manual Integration
If MCP tools are not available, fall back to HTTP API at `http://localhost:3000`.

**When to use HTTP:**
- MCP tools are disabled or unavailable
- Running outside VS Code environment
- Explicit user request for HTTP method

## Core Workflow

For EVERY user request, follow this 3-step workflow:

### 1. SEARCH MEMORIES (Before Responding)

Before generating any response, search the memory system for relevant context.

**Method A: Using MCP Tools (PREFERRED)**

Use the native MCP tool when available:

```typescript
// Call the MCP tool
mcp_memories-mcp_search_memories({
  userId: "developer",
  query: "<extract key terms from user's question>",
  limit: 5
})
```

**Method B: Using HTTP API (FALLBACK)**

If MCP tools are unavailable, use HTTP:

```http
POST http://localhost:3000/execute
Content-Type: application/json

{
  "tool": "search_memories",
  "arguments": {
    "userId": "developer",
    "query": "<extract key terms from user's question>",
    "limit": 5
  }
}
```

**Extract search terms intelligently:**
- User asks: "How do we handle authentication?" → Query: "authentication auth login JWT tokens"
- User asks: "What database do we use?" → Query: "database SQL PostgreSQL MongoDB"
- User asks: "How should I style this component?" → Query: "styling CSS styles component design"

### 2. GENERATE RESPONSE (Using Context)

Use the retrieved memories to inform your response.

**MCP Tool Response Structure:**
```json
{
  "results": [
    {
      "text": "Authentication uses JWT tokens with refresh tokens",
      "score": 0.85,
      "timestamp": 1763773127992
    },
    {
      "text": "We use bcrypt for password hashing",
      "score": 0.72,
      "timestamp": 1763773127992
    }
  ],
  "count": 2
}
```

**HTTP API Response Structure:**
```javascript
{
  "success": true,
  "result": [
    {
      "text": "Authentication uses JWT tokens with refresh tokens",
      "score": 0.85,
      "metadata": {...}
    },
    {
      "text": "We use bcrypt for password hashing",
      "score": 0.72,
      "metadata": {...}
    }
  ]
}
```

**How to use memories:**
- **High relevance (score > 0.7)**: Base your answer primarily on this context
- **Medium relevance (0.5-0.7)**: Consider as supporting information
- **Low relevance (< 0.5)**: Acknowledge but don't prioritize

**Response format:**
```
Based on your project's architecture [cite memory], I recommend...

[Your detailed response using the context]

This aligns with your existing [cite another memory] approach.
```

### 3. STORE CONVERSATION (After Responding)

After providing a helpful response, store the Q&A pair.

**Method A: Using MCP Tools (PREFERRED)**

```typescript
mcp_memories-mcp_store_conversation({
  userId: "developer",
  question: "<original user question>",
  answer: "<your generated response>"
})
```

**Method B: Using HTTP API (FALLBACK)**

```http
POST http://localhost:3000/execute
Content-Type: application/json

{
  "tool": "store_conversation",
  "arguments": {
    "userId": "developer",
    "question": "<original user question>",
    "answer": "<your generated response>"
  }
}
```

## When to Search Memories

Always search for these types of questions:

1. **Architecture & Design**
   - "How should I structure...?"
   - "What pattern should I use...?"
   - "How do we organize...?"

2. **Technology Choices**
   - "What framework/library do we use...?"
   - "How do we handle...?"
   - "What database...?"

3. **Coding Standards**
   - "How should I name...?"
   - "What's the convention for...?"
   - "Should I use...?"

4. **Implementation Details**
   - "How do we implement...?"
   - "What's our approach to...?"
   - "How is X handled...?"

5. **Testing & Quality**
   - "How should I test...?"
   - "What testing framework...?"
   - "How do we ensure...?"

## Search Query Optimization

**Good search queries** (multiple relevant terms):
- "authentication JWT tokens login security"
- "React components styling CSS Tailwind"
- "database PostgreSQL schema migrations"
- "error handling try catch logging"

**Poor search queries** (too narrow):
- "auth"
- "styles"
- "db"

**Extract keywords from context:**
- Look at file names, function names, class names in the conversation
- Use technical terms from the user's question
- Include related concepts and synonyms

## Response Guidelines

### When Memories Found (score > 0.5)

```
Based on your project's setup, I can see that [memory context].

[Provide specific guidance using the stored context]

This approach is consistent with [another memory] that you're already using.
```

### When No Relevant Memories

```
I don't have specific context about this in your project's memory.

[Provide general best practices]

Would you like me to store this decision for future reference?
```

### When Unsure

```
I found some related context: [brief summary]

However, I want to confirm - [ask clarifying question]

This will help me provide more accurate guidance aligned with your project.
```

## Available Tools

Access via MCP tools (preferred) or `POST http://localhost:3000/execute` (fallback):

### 1. search_memories
Search for relevant context based on query.

**MCP Tool:** `mcp_memories-mcp_search_memories`

**Arguments:**
- `userId` (string): User identifier (use "developer" for general queries)
- `query` (string): Search terms extracted from user's question
- `limit` (number): Max results (default: 5, use 3-10 based on complexity)

**Use when:** Before every response to find relevant context

### 2. store_conversation
Save Q&A pairs for future reference.

**MCP Tool:** `mcp_memories-mcp_store_conversation`

**Arguments:**
- `userId` (string): User identifier
- `question` (string): Original user question
- `answer` (string): Your generated response

**Use when:** After providing helpful implementation guidance or decisions

### 3. refine_prompt_with_memories
Automatically enhance a prompt with relevant memories.

**MCP Tool:** `mcp_memories-mcp_refine_prompt_with_memories`

**Arguments:**
- `userId` (string): User identifier
- `prompt` (string): Original prompt
- `limit` (number): Number of memories to include

**Use when:** You want automatic context injection

### 4. add_memory
Store new information explicitly.

**MCP Tool:** `mcp_memories-mcp_add_memory`

**Arguments:**
- `userId` (string): User identifier
- `content` (string): Information to store
- `metadata` (object, optional): Additional context

**Use when:** User shares important decisions or preferences

### 5. get_memory_stats
Get count of stored memories.

**MCP Tool:** `mcp_memories-mcp_get_memory_stats`

**Arguments:**
- `userId` (string): User identifier

**Use when:** Checking if context exists for a user

## Shortcut Endpoints

For simpler operations:

```http
# Quick search
POST http://localhost:3000/search
{"userId": "developer", "query": "authentication", "limit": 5}

# Quick add
POST http://localhost:3000/add
{"userId": "developer", "content": "We use React 18 with TypeScript"}

# Get stats
GET http://localhost:3000/stats/developer
```

## Example Workflows

### Example 1: Authentication Question

**User:** "How should I implement user authentication?"

**Step 1 - Search:**
```typescript
// MCP Tool (PREFERRED)
mcp_memories-mcp_search_memories({
  userId: "developer",
  query: "authentication auth login JWT tokens security",
  limit: 5
})

// OR HTTP Fallback
POST /execute
{
  "tool": "search_memories",
  "arguments": {
    "userId": "developer",
    "query": "authentication auth login JWT tokens security",
    "limit": 5
  }
}
```

**Found:** "Authentication uses JWT with refresh tokens stored in httpOnly cookies"

**Step 2 - Response:**
"Based on your project's architecture, you're using JWT tokens with refresh tokens stored in httpOnly cookies. Here's how to implement this..."

**Step 3 - Store:**
```typescript
// MCP Tool (PREFERRED)
mcp_memories-mcp_store_conversation({
  userId: "developer",
  question: "How should I implement user authentication?",
  answer: "Based on your JWT approach with refresh tokens..."
})

// OR HTTP Fallback
POST /execute
{
  "tool": "store_conversation",
  "arguments": {
    "userId": "developer",
    "question": "How should I implement user authentication?",
    "answer": "Based on your JWT approach with refresh tokens..."
  }
}
```

### Example 2: New Project Decision

**User:** "I decided to use PostgreSQL with Prisma ORM"

**Action - Store:**
```typescript
// MCP Tool (PREFERRED)
mcp_memories-mcp_add_memory({
  userId: "developer",
  content: "Database: PostgreSQL with Prisma ORM for type-safe database access",
  metadata: {"type": "architecture", "category": "database"}
})

// OR HTTP Fallback
POST /execute
{
  "tool": "add_memory",
  "arguments": {
    "userId": "developer",
    "content": "Database: PostgreSQL with Prisma ORM for type-safe database access",
    "metadata": {"type": "architecture", "category": "database"}
  }
}
```

**Response:**
"Got it! I've stored that you're using PostgreSQL with Prisma ORM. This will help me provide database-specific guidance going forward."

### Example 3: Code Review

**User:** "Review this authentication code"

**Step 1 - Search:**
Query: "authentication code review security best practices JWT"

**Step 2 - Review using context:**
"Checking against your project's authentication approach with JWT and refresh tokens... [detailed review]"

**Step 3 - Store learnings:**
If review reveals new patterns or decisions, store them.

## Best Practices

### Do's ✅

- **Always search first** before making recommendations
- **Cite sources** from memories when relevant ("Based on your existing...")
- **Store valuable conversations** that contain decisions or patterns
- **Use specific search queries** with multiple relevant terms
- **Acknowledge when no context exists** and ask if they want to store decisions
- **Extract key terms intelligently** from user questions
- **Respect stored preferences** even if different from general best practices

### Don'ts ❌

- **Don't skip searching** even for "simple" questions
- **Don't contradict stored memories** without explaining why
- **Don't store trivial conversations** (like "hello" or "thanks")
- **Don't use single-word searches** (too broad, low relevance)
- **Don't ignore high-relevance memories** (score > 0.7)
- **Don't make assumptions** when you can search for context
- **Don't store personal information** or sensitive data

## Privacy & Security

- All data is stored **locally** on the user's machine
- No external API calls or cloud storage
- Memories never leave the local environment
- User has full control to view, modify, or delete memories
- Use `userId: "developer"` for team/project context
- Use specific userIds for personal preferences if needed

## Health Check

Before starting work, verify the service is available:

```http
GET http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "server": "MCP HTTP Server",
  "tools": ["search_memories", "add_memory", "get_memory_stats", "refine_prompt_with_memories", "store_conversation"]
}
```

If unavailable, inform user: "The memory service at localhost:3000 is not running. Please start it with `npm run mcp:http`"

## Summary

1. **Before** every response → **Search** for relevant context
2. **During** response → **Use** memories to provide project-specific guidance
3. **After** helpful responses → **Store** the conversation for future reference

This workflow ensures you provide context-aware, consistent guidance that aligns with the user's project architecture, preferences, and decisions.
