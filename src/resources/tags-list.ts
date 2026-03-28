import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Resource: wiki://tags
 * List all unique tags used in the wiki
 */
export function registerTagsResource(
	server: McpServer,
	wikiClient: WikiJSClient
) {
	server.resource(
		"wiki-tags",
		"wiki://tags",
		async (uri: URL) => {
			const resourceLogger = new MCPLogger(generateRequestId());
			resourceLogger.info('Resource accessed', { uri: uri.href });

			try {
				const pages = await wikiClient.listPages(100);

				// Extract and count tags
				const tagCounts: Record<string, { count: number; pages: Array<{ id: number; title: string }> }> = {};

				pages.forEach(page => {
					page.tags?.forEach(tagObj => {
						const tag = tagObj.tag;
						if (!tagCounts[tag]) {
							tagCounts[tag] = { count: 0, pages: [] };
						}
						tagCounts[tag].count++;
						tagCounts[tag].pages.push({ id: page.id, title: page.title });
					});
				});

				const content = JSON.stringify({
					totalTags: Object.keys(tagCounts).length,
					tags: Object.entries(tagCounts)
						.map(([name, data]) => ({ name, pageCount: data.count, pages: data.pages }))
						.sort((a, b) => b.pageCount - a.pageCount)
				}, null, 2);

				return {
					contents: [{
						uri: uri.href,
						mimeType: "application/json",
						text: content
					}]
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				resourceLogger.error('Resource access failed', { error: errorMessage });
				throw new Error(`Failed to retrieve tags: ${errorMessage}`);
			}
		}
	);
}
