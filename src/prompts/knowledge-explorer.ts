import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Prompt: knowledge_explorer
 * Explore connected topics in the wiki knowledge graph
 */
export function registerKnowledgeExplorerPrompt(
	server: McpServer
) {
	server.prompt(
		"knowledge_explorer",
		{
			startingTopic: z.string().describe("The starting topic to explore from"),
			explorationDepth: z.number().min(1).max(3).optional().describe("How deep to explore connections (1-3)"),
		},
		({ startingTopic, explorationDepth }: { startingTopic: string; explorationDepth?: number }) => ({
			messages: [{
				role: "user",
				content: {
					type: "text",
					text: `I want to explore the knowledge graph around "${startingTopic}". Please help me discover related concepts and pages in the wiki.
Start by:
1. Search for pages about "${startingTopic}"
2. Pick the most relevant page and get its full content
3. Identify the tags on that page
4. Use find_related_pages or explore_knowledge_graph to discover connected content
5. Present the findings as a knowledge map showing how topics connect
Explore depth: ${explorationDepth || 2} levels deep. Show me how different concepts in our wiki are related to "${startingTopic}".`
				}
			}]
		})
	);
}
