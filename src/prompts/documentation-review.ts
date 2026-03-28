import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Prompt: documentation_review
 * Review and suggest improvements for existing documentation
 */
export function registerDocumentationReviewPrompt(
	server: McpServer
) {
	server.prompt(
		"documentation_review",
		{
			pageId: z.string().describe("The page ID to review"),
		},
		({ pageId }: { pageId: string }) => ({
			messages: [{
				role: "user",
				content: {
					type: "text",
					text: `Review the documentation on page ID ${pageId} and provide improvement suggestions.
Steps:
1. Use get_wiki_page to retrieve the full content of page ${pageId}
2. Analyze the content structure, clarity, and completeness
3. Check if the page has appropriate tags
4. Look for related pages that should be linked
5. Provide specific recommendations for:
   - Structure improvements
   - Missing information
   - Clarity enhancements
   - Tag suggestions
   - Cross-linking opportunities
Be constructive and specific in your feedback.`
				}
			}]
		})
	);
}
