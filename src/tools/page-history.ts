import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: get_page_history
 * Get revision history of a specific page (simulated - WikiJS API may vary)
 */
export function registerPageHistoryTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "get_page_history",
    {
      pageId: z.string().describe("The page ID to get history for"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of history entries (default: 10)"),
    },
    async ({ pageId, limit }: { pageId: string; limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: get_page_history", {
        pageId,
        limit: limit || 10,
      });
      try {
        // Get the page to verify it exists
        const page = await wikiClient.getPage(pageId);
        if (!page) {
          toolLogger.info("Page not found for history", { pageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page not found with ID: ${pageId}`,
              },
            ],
          };
        }
        // Note: WikiJS may not expose full history via GraphQL
        // This returns current page info as a baseline
        toolLogger.info("Page history retrieved", {
          pageId,
          title: page.title,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Page History for "${page.title}" (ID: ${pageId})
Current Version:
- Last Updated: ${page.updatedAt || "N/A"}
- Path: ${page.path}
- Tags: ${page.tags?.map((t) => t.tag).join(", ") || "None"}
Note: WikiJS GraphQL API provides current state. Full revision history may require admin access or different endpoints.`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Get page history failed", {
          pageId,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving page history: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
