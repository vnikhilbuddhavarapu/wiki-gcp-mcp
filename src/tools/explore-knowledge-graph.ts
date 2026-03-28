import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WikiJSClient } from "../wikijs-client";
import { generateRequestId, MCPLogger } from "../shared/utils";

/**
 * Tool: explore_knowledge_graph
 * Explore pages connected through tags as a knowledge graph
 */
export function registerExploreKnowledgeGraphTool(
  server: McpServer,
  wikiClient: WikiJSClient,
) {
  server.tool(
    "explore_knowledge_graph",
    {
      startPageId: z.string().describe("The starting page ID to explore from"),
      depth: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe("How many levels deep to explore (default: 2, max: 3)"),
    },
    async ({ startPageId, depth }: { startPageId: string; depth?: number }) => {
      const toolRequestId = generateRequestId();
      const toolLogger = new MCPLogger(toolRequestId);
      const exploreDepth = depth || 2;
      toolLogger.info("Tool invoked: explore_knowledge_graph", {
        startPageId,
        depth: exploreDepth,
      });
      try {
        const startPage = await wikiClient.getPage(startPageId);
        if (!startPage) {
          toolLogger.info("Start page not found", { startPageId });
          return {
            content: [
              {
                type: "text" as const,
                text: `Starting page not found with ID: ${startPageId}`,
              },
            ],
          };
        }
        const allPagesList = await wikiClient.listPages(100);
        // Fetch full page details to get tags
        const allPages = await Promise.all(
          allPagesList.map(async (p) => {
            try {
              return await wikiClient.getPage(p.id);
            } catch {
              return null;
            }
          }),
        ).then((pages) =>
          pages.filter((p): p is NonNullable<typeof p> => p !== null),
        );
        const visited = new Set<number>();
        const graph: Array<{
          level: number;
          page: { id: number; title: string; path: string };
          connections: string[];
        }> = [];
        // BFS exploration
        let currentLevel = [{ page: startPage, level: 0 }];
        visited.add(startPage.id);
        graph.push({
          level: 0,
          page: {
            id: startPage.id,
            title: startPage.title,
            path: startPage.path,
          },
          connections: startPage.tags?.map((t) => t.tag) || [],
        });
        for (
          let level = 1;
          level <= exploreDepth && currentLevel.length > 0;
          level++
        ) {
          const nextLevel: typeof currentLevel = [];
          for (const { page } of currentLevel) {
            const pageTags = new Set(
              page.tags?.map((t) => t.tag.toLowerCase()) || [],
            );
            for (const otherPage of allPages) {
              if (visited.has(otherPage.id)) continue;
              const otherTags = new Set(
                otherPage.tags?.map((t) => t.tag.toLowerCase()) || [],
              );
              const hasConnection = [...pageTags].some((tag) =>
                otherTags.has(tag),
              );
              if (hasConnection) {
                visited.add(otherPage.id);
                nextLevel.push({ page: otherPage, level });
                graph.push({
                  level,
                  page: {
                    id: otherPage.id,
                    title: otherPage.title,
                    path: otherPage.path,
                  },
                  connections: [...pageTags].filter((tag) =>
                    otherTags.has(tag),
                  ),
                });
              }
            }
          }
          currentLevel = nextLevel;
        }

        toolLogger.info("Knowledge graph explored", {
          startPageId,
          nodes: graph.length,
        });
        // Format the graph
        let output = `Knowledge Graph: "${startPage.title}"\n`;
        output += `Found ${graph.length - 1} connected pages (depth: ${exploreDepth})\n\n`;
        for (let i = 0; i <= exploreDepth; i++) {
          const levelNodes = graph.filter((n) => n.level === i);
          if (levelNodes.length > 0) {
            output += `[Level ${i}]\n`;
            levelNodes.forEach((n) => {
              const indent = "  ".repeat(i);
              output += `${indent}• ${n.page.title} (ID: ${n.page.id})`;
              if (n.connections.length > 0 && i > 0) {
                output += ` ← connected via: ${n.connections.slice(0, 3).join(", ")}`;
              }
              output += "\n";
            });
            output += "\n";
          }
        }

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toolLogger.error("Explore knowledge graph failed", {
          startPageId,
          error: errorMessage,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Error exploring knowledge graph: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
