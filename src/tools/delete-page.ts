import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger, sanitizePath } from "../shared/utils";

/**
 * Tool: delete_wiki_page
 * Delete a page by ID or path
 */
export function registerDeletePageTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "delete_wiki_page",
    {
      pageId: z
        .number()
        .optional()
        .describe("The page ID to delete (use this or path)"),
      path: z
        .string()
        .optional()
        .describe("The page path to delete (use this or pageId)"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set to true to confirm deletion"),
    },
    async ({
      pageId,
      path: rawPath,
      confirm,
    }: {
      pageId?: number;
      path?: string;
      confirm?: boolean;
    }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);

      // Sanitize path if provided
      const path = rawPath ? sanitizePath(rawPath) : undefined;

      toolLogger.info("Tool invoked: delete_wiki_page", {
        pageId,
        path,
        confirmed: confirm,
      });

      try {
        // Validate at least one identifier is provided
        if (!pageId && !path) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: You must provide either pageId or path to identify the page to delete.",
              },
            ],
            isError: true,
          };
        }

        // Find the page by ID or path
        let targetId: number;
        let pageTitle: string;
        let pagePath: string;

        if (pageId) {
          const page = await wikiClient.getPage(pageId);
          if (!page) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Page not found with ID: ${pageId}`,
                },
              ],
              isError: true,
            };
          }
          targetId = page.id;
          pageTitle = page.title;
          pagePath = page.path;
        } else if (path) {
          const pages = await wikiClient.listPages(100);
          const page = pages.find(
            (p) => p.path.toLowerCase() === path.toLowerCase(),
          );
          if (!page) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Page not found with path: "${path}"`,
                },
              ],
              isError: true,
            };
          }
          targetId = page.id;
          pageTitle = page.title;
          pagePath = page.path;
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Unable to determine page ID.",
              },
            ],
            isError: true,
          };
        }

        // Require confirmation
        if (!confirm) {
          return {
            content: [
              {
                type: "text" as const,
                text: `⚠️ DELETE PREVIEW\n\nPage to delete:\n- ID: ${targetId}\n- Title: "${pageTitle}"\n- Path: "${pagePath}"\n\nTo confirm deletion, set "confirm" to true and run again.`,
              },
            ],
          };
        }

        // Delete the page
        const success = await wikiClient.deletePage(targetId);

        if (success) {
          toolLogger.info("Page deleted successfully", {
            id: targetId,
            title: pageTitle,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page deleted successfully.\n\nID: ${targetId}\nTitle: "${pageTitle}"\nPath: "${pagePath}"`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: `Failed to delete page. The page may not exist or you may not have permission.`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Delete page failed", {
          pageId,
          path,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting page: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
