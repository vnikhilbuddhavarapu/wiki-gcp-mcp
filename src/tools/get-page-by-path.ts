import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: get_page_by_path
 * Get a specific page by its path/slug
 */
export function registerGetPageByPathTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "get_page_by_path",
    {
      path: z
        .string()
        .describe(
          "The page path/slug (e.g., 'home', 'docs/api', 'team/handbook')",
        ),
    },
    async ({ path }: { path: string }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: get_page_by_path", { path });
      try {
        // Get all pages and find by path
        const pages = await wikiClient.listPages(100);
        const page = pages.find(
          (p) => p.path.toLowerCase() === path.toLowerCase(),
        );
        if (!page) {
          toolLogger.info("Page not found by path", { path });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page not found with path: "${path}"`,
              },
            ],
          };
        }
        // Get full content using the ID
        const fullPage = await wikiClient.getPage(page.id);
        if (!fullPage) {
          toolLogger.info("Page details not found", { path, id: page.id });
          return {
            content: [
              {
                type: "text" as const,
                text: `Found page metadata but could not retrieve full content for: "${path}"`,
              },
            ],
          };
        }
        const formattedContent = `Title: ${fullPage.title}
Path: ${fullPage.path}
ID: ${fullPage.id}
Updated: ${fullPage.updatedAt || "N/A"}
Tags: ${fullPage.tags?.map((t) => t.tag).join(", ") || "None"}
${fullPage.content || "No content available"}`.trim();
        toolLogger.info("Page retrieved by path successfully", {
          path,
          title: fullPage.title,
        });
        return {
          content: [{ type: "text" as const, text: formattedContent }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Get page by path failed", {
          path,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving page by path: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
