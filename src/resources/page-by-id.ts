import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Resource: wiki://pages/{id}
 * Get a specific page by ID as JSON
 */
export function registerPageByIdResource(
  server: McpServer,
  wikiClient: WikiJSClient,
  wikiBaseUrl: string,
) {
  server.resource(
    "wiki-page-by-id",
    "wiki://pages/{id}",
    async (uri: URL, _extra: unknown) => {
      // Extract id from URI path
      const pathParts = uri.pathname.split("/");
      const id = pathParts[pathParts.length - 1];
      const resourceLogger = new MCPLogger(generateRequestId());
      resourceLogger.info("Resource accessed", { uri: uri.href, id });

      try {
        const page = await wikiClient.getPage(id);

        if (!page) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify({ error: "Page not found" }, null, 2),
              },
            ],
          };
        }

        const content = JSON.stringify(
          {
            id: page.id,
            title: page.title,
            path: page.path,
            description: page.description,
            content: page.content,
            tags: page.tags,
            updatedAt: page.updatedAt,
            url: `${wikiBaseUrl}/${page.path}`,
          },
          null,
          2,
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        resourceLogger.error("Resource access failed", {
          id,
          error: errorMessage,
        });
        throw new Error(`Failed to retrieve page: ${errorMessage}`);
      }
    },
  );
}
