import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Resource: wiki://pages
 * List all wiki pages as a JSON resource
 */
export function registerPagesResource(
	server: McpServer,
	wikiClient: WikiJSClient,
	wikiBaseUrl: string
) {
	server.resource(
		"wiki-pages",
		"wiki://pages",
		async (uri: URL) => {
			const resourceLogger = new MCPLogger(generateRequestId());
			resourceLogger.info('Resource accessed', { uri: uri.href });

			try {
				const pages = await wikiClient.listPages(100);
				const content = JSON.stringify({
					pages: pages.map(p => ({
						id: p.id,
						title: p.title,
						path: p.path,
						updatedAt: p.updatedAt,
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
				throw new Error(`Failed to retrieve wiki pages: ${errorMessage}`);
			}
		}
	);
}
