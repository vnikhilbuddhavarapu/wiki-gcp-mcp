import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: search_by_tag
 * Find all pages that have a specific tag
 */
export function registerSearchByTagTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "search_by_tag",
    {
      tag: z
        .string()
        .describe(
          "The tag to search for (e.g., 'api', 'documentation', 'tutorial')",
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of results (default: 20)"),
    },
    async ({ tag, limit }: { tag: string; limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: search_by_tag", {
        tag,
        limit: limit || 20,
      });
      try {
        // Get all pages
        const pages = await wikiClient.listPages(100);

        // Fetch full page details to get tags (listPages doesn't include tags)
        const pagesWithTags = await Promise.all(
          pages.map(async (page) => {
            try {
              return await wikiClient.getPage(page.id);
            } catch {
              return null;
            }
          }),
        );

        // Filter by tag
        const matchingPages = pagesWithTags.filter(
          (page): page is NonNullable<typeof page> =>
            page !== null &&
            !!page.tags?.some((t) => t.tag.toLowerCase() === tag.toLowerCase()),
        );
        const limitedPages = matchingPages.slice(0, limit || 20);
        toolLogger.info("Tag search completed", {
          tag,
          resultCount: matchingPages.length,
        });
        if (matchingPages.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No pages found with tag: "${tag}"`,
              },
            ],
          };
        }
        const formattedResults = limitedPages
          .map(
            (p) =>
              `ID: ${p.id} | Title: ${p.title} | Path: ${p.path} | Updated: ${p.updatedAt || "N/A"}`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `Pages with tag "${tag}" (${matchingPages.length} total):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Search by tag failed", { tag, error: errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching by tag: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
