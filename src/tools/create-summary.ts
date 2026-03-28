import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: create_page_summary
 * Generate an AI summary of a page (content analysis)
 */
export function registerCreateSummaryTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "create_page_summary",
    {
      pageId: z.string().describe("The page ID to summarize"),
      maxLength: z
        .number()
        .min(50)
        .max(1000)
        .optional()
        .describe("Maximum summary length in characters (default: 300)"),
    },
    async ({ pageId, maxLength }: { pageId: string; maxLength?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      const targetLength = maxLength || 300;
      toolLogger.info("Tool invoked: create_page_summary", {
        pageId,
        maxLength: targetLength,
      });
      try {
        const page = await wikiClient.getPage(pageId);
        if (!page) {
          toolLogger.info("Page not found for summary", { pageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Page not found with ID: ${pageId}`,
              },
            ],
          };
        }
        // Extract first few sentences as a simple summary
        const content = page.content || "";
        const sentences = content
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0);
        const summarySentences = sentences.slice(0, 3);
        let summary = summarySentences.join(". ");
        if (summary.length > targetLength) {
          summary = summary.substring(0, targetLength).trim() + "...";
        }

        toolLogger.info("Summary created", {
          pageId,
          title: page.title,
          summaryLength: summary.length,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Summary of "${page.title}":\n\n${summary}\n\nFull page available at path: ${page.path}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Create summary failed", {
          pageId,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating summary: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
