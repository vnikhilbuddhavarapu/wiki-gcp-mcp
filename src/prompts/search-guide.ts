import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Prompt: wiki_search_guide
 * Guide for effectively searching WikiJS content
 */
export function registerSearchGuidePrompt(
	server: McpServer
) {
	server.prompt(
		"wiki_search_guide",
		{
			topic: z.string().describe("The topic or subject to search for"),
		},
		({ topic }: { topic: string }) => ({
			messages: [{
				role: "user",
				content: {
					type: "text",
					text: `I need to find information about "${topic}" in the WikiJS documentation. Please:
1. Use the search_wiki_pages tool to find relevant pages
2. If you find relevant pages, use get_wiki_page to retrieve the most detailed content
3. If the first search doesn't yield good results, try alternative search terms
4. Present the information in a clear, organized way
Start by searching for "${topic}".`
				}
			}]
		})
	);
}
