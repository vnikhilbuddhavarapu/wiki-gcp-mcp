import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger, sanitizePath } from "../shared/utils";

/**
 * Tool: update_wiki_page
 * Update an existing page by ID or path
 */
export function registerUpdatePageTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "update_wiki_page",
    {
      pageId: z
        .number()
        .optional()
        .describe("The page ID to update (use this or path)"),
      path: z
        .string()
        .optional()
        .describe("The page path to update (use this or pageId)"),
      title: z.string().optional().describe("New title for the page"),
      content: z
        .string()
        .optional()
        .describe("New markdown content for the page"),
      description: z
        .string()
        .optional()
        .describe("New description for the page"),
      tags: z
        .array(z.string())
        .optional()
        .describe("New tags to replace existing ones"),
    },
    async ({
      pageId,
      path: rawPath,
      title,
      content,
      description,
      tags,
    }: {
      pageId?: number;
      path?: string;
      title?: string;
      content?: string;
      description?: string;
      tags?: string[];
    }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);

      // Sanitize path if provided
      const path = rawPath ? sanitizePath(rawPath) : undefined;

      toolLogger.info("Tool invoked: update_wiki_page", {
        pageId,
        path,
        hasTitle: !!title,
        hasContent: !!content,
      });

      try {
        // Validate at least one identifier is provided
        if (!pageId && !path) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: You must provide either pageId or path to identify the page to update.",
              },
            ],
            isError: true,
          };
        }

        // Validate at least one field to update is provided
        if (!title && !content && !description && !tags) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: You must provide at least one field to update (title, content, description, or tags).",
              },
            ],
            isError: true,
          };
        }

        // Find the page by ID or path
        let targetId: number;
        let pageTitle: string;

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

        // Update the page
        const updatedPage = await wikiClient.updatePage(
          targetId,
          title,
          content,
          description,
          tags,
        );

        toolLogger.info("Page updated successfully", {
          id: updatedPage.id,
          title: updatedPage.title,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Page updated successfully!\n\nID: ${updatedPage.id}\nTitle: ${updatedPage.title}\nPath: ${updatedPage.path}\nUpdated at: ${updatedPage.updatedAt || "N/A"}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Update page failed", {
          pageId,
          path,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating page: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
