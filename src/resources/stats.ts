import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Resource: wiki://stats
 * Wiki statistics and metrics
 */
export function registerStatsResource(
	server: McpServer,
	wikiClient: WikiJSClient
) {
	server.resource(
		"wiki-stats",
		"wiki://stats",
		async (uri: URL) => {
			const resourceLogger = new MCPLogger(generateRequestId());
			resourceLogger.info('Resource accessed', { uri: uri.href });

			try {
				const pages = await wikiClient.listPages(1000);

				// Calculate statistics
				const totalPages = pages.length;
				const taggedPages = pages.filter(p => p.tags && p.tags.length > 0).length;
				const untaggedPages = totalPages - taggedPages;

				// Count tags
				const tagCounts: Record<string, number> = {};
				pages.forEach(page => {
					page.tags?.forEach(tagObj => {
						tagCounts[tagObj.tag] = (tagCounts[tagObj.tag] || 0) + 1;
					});
				});

				const sortedTags = Object.entries(tagCounts)
					.map(([name, count]) => ({ name, count }))
					.sort((a, b) => b.count - a.count);

				// Recent activity (pages updated in last 30 days)
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				const recentActivity = pages.filter(p =>
					p.updatedAt && new Date(p.updatedAt) >= thirtyDaysAgo
				).length;

				// Find oldest and newest pages
				const sortedByDate = pages
					.filter(p => p.updatedAt)
					.sort((a, b) => new Date(a.updatedAt!).getTime() - new Date(b.updatedAt!).getTime());

				const content = JSON.stringify({
					generatedAt: new Date().toISOString(),
					overview: {
						totalPages,
						taggedPages,
						untaggedPages,
						uniqueTags: Object.keys(tagCounts).length,
						recentActivityLast30Days: recentActivity
					},
					topTags: sortedTags.slice(0, 10),
					oldestPage: sortedByDate[0] ? {
						id: sortedByDate[0].id,
						title: sortedByDate[0].title,
						updatedAt: sortedByDate[0].updatedAt
					} : null,
					newestPage: sortedByDate[sortedByDate.length - 1] ? {
						id: sortedByDate[sortedByDate.length - 1].id,
						title: sortedByDate[sortedByDate.length - 1].title,
						updatedAt: sortedByDate[sortedByDate.length - 1].updatedAt
					} : null
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
				throw new Error(`Failed to retrieve wiki stats: ${errorMessage}`);
			}
		}
	);
}
