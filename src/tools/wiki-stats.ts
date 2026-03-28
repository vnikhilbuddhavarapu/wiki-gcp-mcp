import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: get_wiki_stats
 * Get statistics about the wiki (page count, tags, etc)
 */
export function registerWikiStatsTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool("get_wiki_stats", {}, async () => {
    const toolRequestId = generateRequestId();
    const toolLogger = new MCPLogger(toolRequestId);
    toolLogger.info("Tool invoked: get_wiki_stats");
    try {
      // Get all pages to calculate stats
      const pages = await wikiClient.listPages(1000);
      // Calculate statistics
      const totalPages = pages.length;
      const taggedPages = pages.filter(
        (p) => p.tags && p.tags.length > 0,
      ).length;
      const uniqueTags = new Set<string>();
      pages.forEach((p) => p.tags?.forEach((t) => uniqueTags.add(t.tag)));
      // Find most recent update
      const sortedByDate = pages
        .filter((p) => p.updatedAt)
        .sort(
          (a, b) =>
            new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime(),
        );
      const lastUpdate = sortedByDate[0]?.updatedAt || "N/A";
      const lastUpdatedPage = sortedByDate[0]?.title || "N/A";
      toolLogger.info("Wiki stats calculated", {
        totalPages,
        uniqueTags: uniqueTags.size,
      });
      const stats = `Wiki Statistics:
Total Pages: ${totalPages}
Pages with Tags: ${taggedPages}
Unique Tags: ${uniqueTags.size}
Most Recent Update: ${lastUpdate}
Last Updated Page: ${lastUpdatedPage}
Top Tags: ${Array.from(uniqueTags).slice(0, 10).join(", ") || "None"}`;
      return {
        content: [{ type: "text" as const, text: stats }],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toolLogger.error("Get wiki stats failed", { error: errorMessage });
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving wiki stats: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });
}
