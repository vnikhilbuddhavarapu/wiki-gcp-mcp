import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: search_wiki_pages
 * Search for pages in WikiJS using keywords
 */
export function registerSearchPagesTool(
	server: McpServer,
	wikiClient: WikiJSClient
) {
	server.tool(
		"search_wiki_pages",
		{
			query: z.string().describe("The search query to find pages"),
			limit: z.number().min(1).max(50).optional().describe("Maximum number of results (default: 10, max: 50)"),
		},
		async ({ query, limit }: { query: string; limit?: number }) => {
			const toolRequestId = generateRequestId();
			const toolLogger = new MCPLogger(toolRequestId);

			toolLogger.info('Tool invoked: search_wiki_pages', { query, limit: limit || 10 });

			try {
				const pages = await wikiClient.searchPages(query, limit || 10);

				if (pages.length === 0) {
					toolLogger.info('No pages found for query', { query });
					return {
						content: [{ type: "text" as const, text: `No pages found for query: "${query}"` }],
					};
				}

				const formattedResults = pages.map(p =>
					`ID: ${p.id}\nTitle: ${p.title}\nPath: ${p.path}\nDescription: ${p.description || 'N/A'}`
				).join('\n\n');

				toolLogger.info('Search completed successfully', { query, resultCount: pages.length });

				return {
					content: [{ type: "text" as const, text: `Found ${pages.length} page(s) for "${query}":\n\n${formattedResults}` }],
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				toolLogger.error('Search failed', { query, error: errorMessage });
				return {
					content: [{ type: "text" as const, text: `Error searching pages: ${errorMessage}` }],
					isError: true,
				};
			}
		}
	);
}
