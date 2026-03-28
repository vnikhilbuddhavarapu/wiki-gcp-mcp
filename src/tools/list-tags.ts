import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: list_page_tags
 * Get all unique tags used across all wiki pages
 */
export function registerListTagsTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "list_page_tags",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of tags to return (default: 50)"),
    },
    async ({ limit }: { limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: list_page_tags", { limit: limit || 50 });
      try {
        // Get all pages
        const pages = await wikiClient.listPages(100);

        // Fetch full page details to get tags (listPages doesn't include tags)
        const tagSet = new Set<string>();
        for (const page of pages) {
          try {
            const fullPage = await wikiClient.getPage(page.id);
            fullPage?.tags?.forEach((t) => tagSet.add(t.tag));
          } catch {
            // Skip pages that fail to load
          }
        }

        const tags = Array.from(tagSet).sort();
        const limitedTags = tags.slice(0, limit || 50);
        toolLogger.info("Tags listed successfully", {
          totalTags: tags.length,
          returned: limitedTags.length,
        });
        if (tags.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No tags found in the wiki." },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Wiki Tags (${tags.length} total):\n\n${limitedTags.join(", ")}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("List tags failed", { error: errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing tags: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
