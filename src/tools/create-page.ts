import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger, sanitizePath } from "../shared/utils";

/**
 * Tool: create_wiki_page
 * Create a new page in the wiki
 */
export function registerCreatePageTool(
  server: McpServer,
  wikiClient: WikiJSClient,
  wikiBaseUrl: string,
) {
  server.tool(
    "create_wiki_page",
    {
      title: z.string().describe("The title of the new page"),
      path: z
        .string()
        .describe(
          "The URL path/slug for the page (e.g., 'guides/getting-started')",
        ),
      content: z.string().describe("The markdown content of the page"),
      description: z
        .string()
        .optional()
        .describe("Optional short description of the page"),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          "Optional array of tags (e.g., ['documentation', 'tutorial'])",
        ),
    },
    async ({
      title,
      path: rawPath,
      content,
      description,
      tags,
    }: {
      title: string;
      path: string;
      content: string;
      description?: string;
      tags?: string[];
    }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);

      // Sanitize path to ensure consistent format
      const path = sanitizePath(rawPath);

      toolLogger.info("Tool invoked: create_wiki_page", {
        title,
        path,
        hasTags: !!tags,
      });

      try {
        // Check if page already exists by trying to get it by path
        const pages = await wikiClient.listPages(100);
        const existingPage = pages.find(
          (p) => p.path.toLowerCase() === path.toLowerCase(),
        );

        if (existingPage) {
          toolLogger.info("Page already exists", {
            path,
            existingId: existingPage.id,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page with path "${path}" already exists (ID: ${existingPage.id}). Use a different path or update the existing page.`,
              },
            ],
            isError: true,
          };
        }

        // Create the page
        const newPage = await wikiClient.createPage(
          title,
          path,
          content,
          description,
          tags,
        );

        toolLogger.info("Page created successfully", {
          id: newPage.id,
          title: newPage.title,
          path: newPage.path,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Page created successfully!\n\nID: ${newPage.id}\nTitle: ${newPage.title}\nPath: ${newPage.path}\nURL: ${wikiBaseUrl}/${newPage.path}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Create page failed", {
          title,
          path,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating page: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
