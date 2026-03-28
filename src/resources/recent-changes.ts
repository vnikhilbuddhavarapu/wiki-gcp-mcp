import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Resource: wiki://recent
 * Recently updated pages in the wiki
 */
export function registerRecentChangesResource(
	server: McpServer,
	wikiClient: WikiJSClient,
	wikiBaseUrl: string
) {
	server.resource(
		"wiki-recent",
		"wiki://recent",
		async (uri: URL) => {
			const resourceLogger = new MCPLogger(generateRequestId());
			resourceLogger.info('Resource accessed', { uri: uri.href });

			try {
				const pages = await wikiClient.listPages(100);

				// Sort by updated date, most recent first
				const recentPages = pages
					.filter(p => p.updatedAt)
					.sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
					.slice(0, 20);

				const content = JSON.stringify({
					generatedAt: new Date().toISOString(),
					recentChanges: recentPages.map(p => ({
						id: p.id,
						title: p.title,
						path: p.path,
						updatedAt: p.updatedAt,
						tags: p.tags?.map(t => t.tag),
						url: `${wikiBaseUrl}/${p.path}`
					}))
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
				throw new Error(`Failed to retrieve recent changes: ${errorMessage}`);
			}
		}
	);
}
