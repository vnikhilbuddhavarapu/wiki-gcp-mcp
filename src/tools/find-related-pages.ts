import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: find_related_pages
 * Find pages related to a given page based on tags and content similarity
 */
export function registerFindRelatedPagesTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "find_related_pages",
    {
      pageId: z.string().describe("The page ID to find related content for"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of related pages (default: 5)"),
    },
    async ({ pageId, limit }: { pageId: string; limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      const resultLimit = limit || 5;
      toolLogger.info("Tool invoked: find_related_pages", {
        pageId,
        limit: resultLimit,
      });
      try {
        // Get the source page
        const sourcePage = await wikiClient.getPage(pageId);
        if (!sourcePage) {
          toolLogger.info("Source page not found", { pageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Source page not found with ID: ${pageId}`,
              },
            ],
          };
        }
        // Get all pages with full details (listPages doesn't include tags)
        const pages = await wikiClient.listPages(100);
        const allPages = await Promise.all(
          pages
            .filter((p) => p.id !== sourcePage.id)
            .map(async (p) => {
              try {
                return await wikiClient.getPage(p.id);
              } catch {
                return null;
              }
            }),
        );

        // Find pages with matching tags
        const sourceTags = new Set(
          sourcePage.tags?.map((t) => t.tag.toLowerCase()) || [],
        );
        const relatedPages = allPages
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => {
            const pageTags = new Set(
              p.tags?.map((t) => t.tag.toLowerCase()) || [],
            );
            const matchingTags = [...sourceTags].filter((tag) =>
              pageTags.has(tag),
            );
            return {
              page: p,
              matchCount: matchingTags.length,
              matchingTags,
            };
          })
          .filter((r) => r.matchCount > 0)
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, resultLimit);
        toolLogger.info("Related pages found", {
          pageId,
          resultCount: relatedPages.length,
        });

        if (relatedPages.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No related pages found for "${sourcePage.title}" (no matching tags).`,
              },
            ],
          };
        }

        const formattedResults = relatedPages
          .map(
            (r) =>
              `ID: ${r.page.id} | Title: ${r.page.title} | Path: ${r.page.path} | Matching Tags: ${r.matchingTags.join(", ")}`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `Pages related to "${sourcePage.title}" (${relatedPages.length} found):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Find related pages failed", {
          pageId,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error finding related pages: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
