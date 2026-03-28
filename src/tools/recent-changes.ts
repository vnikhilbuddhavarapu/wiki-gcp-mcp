import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: get_recent_changes
 * Get recently updated pages in the wiki
 */
export function registerRecentChangesTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "get_recent_changes",
    {
      days: z
        .number()
        .min(1)
        .max(90)
        .optional()
        .describe("Number of days to look back (default: 7, max: 90)"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of results (default: 20)"),
    },
    async ({ days, limit }: { days?: number; limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      const lookbackDays = days || 7;
      const resultLimit = limit || 20;
      toolLogger.info("Tool invoked: get_recent_changes", {
        days: lookbackDays,
        limit: resultLimit,
      });
      try {
        // Get all pages and filter by recent updates
        const pages = await wikiClient.listPages(100);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
        const recentPages = pages
          .filter(
            (page) => page.updatedAt && new Date(page.updatedAt) >= cutoffDate,
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt || 0).getTime() -
              new Date(a.updatedAt || 0).getTime(),
          )
          .slice(0, resultLimit);
        toolLogger.info("Recent changes retrieved", {
          days: lookbackDays,
          resultCount: recentPages.length,
        });
        if (recentPages.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No changes in the last ${lookbackDays} days.`,
              },
            ],
          };
        }
        const formattedResults = recentPages
          .map(
            (p) =>
              `ID: ${p.id} | Title: ${p.title} | Path: ${p.path} | Updated: ${p.updatedAt}`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `Recent Changes (${recentPages.length} pages in last ${lookbackDays} days):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Get recent changes failed", {
          days: lookbackDays,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving recent changes: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
