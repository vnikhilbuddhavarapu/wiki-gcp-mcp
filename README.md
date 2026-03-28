# WikiJS MCP Server

A Model Context Protocol (MCP) server for managing WikiJS instances. This server provides read and write capabilities for wiki pages, including search, creation, updates, deletion, and knowledge graph exploration.

**Important:** This is an MCP server without OAuth authentication, designed for trusted environments where the server runs with pre-configured API credentials.

## Features

### Tools (15 Total)

**Read Operations (12 tools):**
- `list_wiki_pages` - List all pages in the wiki
- `get_wiki_page` - Get a specific page by ID
- `get_page_by_path` - Get a page by its path
- `search_wiki_pages` - Search pages by keyword
- `get_page_history` - Get revision history for a page
- `get_recent_changes` - Get recently modified pages
- `list_page_tags` - List all tags used in the wiki
- `search_by_tag` - Find pages by tag
- `find_related_pages` - Discover related content
- `explore_knowledge_graph` - Navigate tag-based knowledge graphs
- `create_page_summary` - Generate summaries of page content
- `export_page_content` - Export page in markdown, HTML, or plain text
- `get_wiki_stats` - Get wiki statistics

**Write Operations (3 tools):**
- `create_wiki_page` - Create new wiki pages
- `update_wiki_page` - Update existing pages by ID or path
- `delete_wiki_page` - Delete pages with confirmation protection

### Prompts (5 Total)
- `new_page_template` - Template for creating new wiki pages
- `documentation_review` - Guide for reviewing documentation
- `faq_generator` - Template for FAQ generation
- `knowledge_explorer` - Explore connections between pages
- `search_guide` - Help users search effectively

### Resources (5 Total)
- `wiki://pages` - List of all pages
- `wiki://page/{id}` - Specific page content by ID
- `wiki://tags` - All available tags
- `wiki://recent-changes` - Recent modifications
- `wiki://stats` - Wiki statistics

## Prerequisites

- Node.js 18+
- A WikiJS instance with API access enabled
- API key from your WikiJS admin panel (Administration > API)

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/vnikhilbuddhavarapu/wiki-mcp.git
cd wiki-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your WikiJS credentials:
```
WIKI_JS_BASE_URL=https://your-wiki-instance.com
WIKI_JS_API_KEY=your-api-key-here
```

4. Run locally:
```bash
npm run dev
```

### Deploy to Cloudflare Workers

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vnikhilbuddhavarapu/wiki-mcp)

1. Click the deploy button above or run:
```bash
npm run deploy
```

2. Set your secrets:
```bash
npx wrangler secret put WIKI_JS_BASE_URL
npx wrangler secret put WIKI_JS_API_KEY
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIKI_JS_BASE_URL` | Yes | Your WikiJS instance URL (e.g., `https://wiki.example.com`) |
| `WIKI_JS_API_KEY` | Yes | API key from WikiJS Administration panel |

### Path Format

Page paths are automatically normalized:
- Input: `my-page`, `/my-page`, `//my-page/`, `my-page/`
- Normalized: `/my-page`

## Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wikijs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://wiki-mcp.your-account.workers.dev/mcp"],
      "env": {
        "WIKI_JS_BASE_URL": "https://your-wiki-instance.com",
        "WIKI_JS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Other MCP Clients

Connect to the mcp endpoint:
```
https://your-worker.your-account.workers.dev/mcp
```

## Project Structure

```
src/
├── index.ts                 # Main MCP server setup and initialization
├── wikijs-client.ts         # GraphQL client for WikiJS API
├── shared/
│   └── utils.ts            # Logging utilities and path sanitization
├── tools/                   # MCP tool implementations
│   ├── create-page.ts
│   ├── delete-page.ts
│   ├── update-page.ts
│   ├── search-pages.ts
│   ├── list-pages.ts
│   ├── get-page.ts
│   ├── get-page-by-path.ts
│   ├── page-history.ts
│   ├── recent-changes.ts
│   ├── list-tags.ts
│   ├── search-by-tag.ts
│   ├── find-related-pages.ts
│   ├── explore-knowledge-graph.ts
│   ├── create-summary.ts
│   ├── export-page.ts
│   ├── wiki-stats.ts
│   └── index.ts            # Tool exports
├── prompts/                # MCP prompt templates
│   ├── new-page-template.ts
│   ├── documentation-review.ts
│   ├── faq-generator.ts
│   ├── knowledge-explorer.ts
│   ├── search-guide.ts
│   └── index.ts            # Prompt exports
└── resources/              # MCP resources
    ├── page-by-id.ts
    ├── pages-list.ts
    ├── tags-list.ts
    ├── recent-changes.ts
    ├── stats.ts
    └── index.ts            # Resource exports

wrangler.jsonc              # Cloudflare Workers configuration
worker-configuration.d.ts    # TypeScript types for bindings
```

## Security Considerations

This MCP server runs without OAuth and uses pre-configured API credentials. Ensure:

1. **API Key Security:** Store `WIKI_JS_API_KEY` as a Cloudflare secret, never commit it to code
2. **Access Control:** The API key inherits permissions from the WikiJS user account it belongs to
3. **Network Security:** Deploy with HTTPS only (enforced by Cloudflare Workers)
4. **Logging:** API keys are never logged; only `hasApiKey: true/false` is tracked

## API Reference

### WikiJS GraphQL API

This server uses the [WikiJS GraphQL API](https://docs.requarks.io/dev/api). Key mutations used:

**Create Page:**
```graphql
mutation {
  pages {
    create(
      title: String!
      path: String!
      content: String!
      editor: "markdown"
      isPublished: true
      isPrivate: false
      locale: "en"
      description: String!
      tags: [String]!
    ) {
      responseResult { succeeded message }
      page { id path title }
    }
  }
}
```

**Update Page:**
```graphql
mutation {
  pages {
    update(
      id: Int!
      title: String
      content: String
      description: String
      tags: [String]
    ) {
      responseResult { succeeded message }
    }
  }
}
```

**Delete Page:**
```graphql
mutation {
  pages {
    delete(id: Int!) {
      responseResult { succeeded message }
    }
  }
}
```

## Relevant Documentation

- [WikiJS GraphQL API Docs](https://docs.requarks.io/dev/api)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare MCP Server Docs](https://developers.cloudflare.com/agents/mcp/)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)

## Troubleshooting

### Common Issues

1. **400 Bad Request on Create:** Ensure your WikiJS API key has write permissions
2. **Page Not Found:** Paths are case-sensitive; check the exact path in WikiJS
3. **Rate Limiting:** Large wikis may hit GraphQL complexity limits; use pagination

### Debug Logging

Enable debug logging in development:
```bash
LOG_LEVEL=debug npm run dev
```

## License

MIT


## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`.

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/mcp`)
3. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
	"mcpServers": {
		"calculator": {
			"command": "npx",
			"args": [
				"mcp-remote",
				"http://wiki-mcp.your-account.workers.dev/mcp"
			]
		}
	}
}
```

Restart Claude and you should see the tools become available.
