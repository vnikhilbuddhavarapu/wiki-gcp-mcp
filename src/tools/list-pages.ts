import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: list_wiki_pages
 * List all available pages in WikiJS with pagination
 */
export function registerListPagesTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "list_wiki_pages",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of pages to list (default: 20, max: 50)"),
    },
    async ({ limit }: { limit?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      toolLogger.info("Tool invoked: list_wiki_pages", { limit: limit || 20 });
      try {
        const pages = await wikiClient.listPages(limit || 20);
        if (pages.length === 0) {
          toolLogger.info("No pages found in wiki");
          return {
            content: [
              { type: "text" as const, text: "No pages found in the wiki." },
            ],
          };
        }
        const formattedPages = pages
          .map(
            (p) =>
              `ID: ${p.id} | Title: ${p.title} | Path: ${p.path} | Updated: ${p.updatedAt || "N/A"}`,
          )
          .join("\n");
        toolLogger.info("List completed successfully", {
          resultCount: pages.length,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Wiki Pages (${pages.length} total):\n\n${formattedPages}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("List failed", { error: errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing pages: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
