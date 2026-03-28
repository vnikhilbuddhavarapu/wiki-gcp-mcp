import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: get_wiki_page
 * Get a specific page by its ID with full content
 */
export function registerGetPageTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "get_wiki_page",
    {
      pageId: z.string().describe("The page ID (numeric) to retrieve"),
    },
    async ({ pageId }: { pageId: string }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: get_wiki_page", { pageId });
      try {
        const page = await wikiClient.getPage(pageId);
        if (!page) {
          toolLogger.info("Page not found", { pageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page not found with ID: ${pageId}`,
              },
            ],
          };
        }
        const formattedContent = `Title: ${page.title}
Path: ${page.path}
ID: ${page.id}
Updated: ${page.updatedAt || "N/A"}
Tags: ${page.tags?.map((t) => t.tag).join(", ") || "None"}
${page.content || "No content available"}`.trim();
        toolLogger.info("Page retrieved successfully", {
          pageId,
          title: page.title,
        });
        return {
          content: [{ type: "text" as const, text: formattedContent }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Get page failed", { pageId, error: errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving page: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
