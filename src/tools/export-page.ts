import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: export_page_content
 * Export page content in different formats (Markdown, JSON, plain text)
 */
export function registerExportPageTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "export_page_content",
    {
      pageId: z.string().describe("The page ID to export"),
      format: z
        .enum(["markdown", "json", "text"])
        .optional()
        .describe("Export format (default: markdown)"),
    },
    async ({
      pageId,
      format,
    }: {
      pageId: string;
      format?: "markdown" | "json" | "text";
    }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      const exportFormat = format || "markdown";
      toolLogger.info("Tool invoked: export_page_content", {
        pageId,
        format: exportFormat,
      });
      try {
        const page = await wikiClient.getPage(pageId);
        if (!page) {
          toolLogger.info("Page not found for export", { pageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page not found with ID: ${pageId}`,
              },
            ],
          };
        }
        let exportedContent: string;
        switch (exportFormat) {
          case "json":
            exportedContent = JSON.stringify(
              {
                id: page.id,
                title: page.title,
                path: page.path,
                content: page.content,
                tags: page.tags,
                updatedAt: page.updatedAt,
              },
              null,
              2,
            );
            break;
          case "text":
            exportedContent = `Title: ${page.title}\nPath: ${page.path}\n\n${page.content || "No content"}`;
            break;
          case "markdown":
          default:
            exportedContent = `# ${page.title}\n\n**Path:** ${page.path}\n**ID:** ${page.id}\n**Updated:** ${page.updatedAt || "N/A"}\n**Tags:** ${page.tags?.map((t) => t.tag).join(", ") || "None"}\n\n---\n\n${page.content || "No content available"}`;
            break;
        }
        toolLogger.info("Page exported", {
          pageId,
          format: exportFormat,
          size: exportedContent.length,
        });
        return {
          content: [{ type: "text" as const, text: exportedContent }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Export page failed", {
          pageId,
          format: exportFormat,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error exporting page: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
