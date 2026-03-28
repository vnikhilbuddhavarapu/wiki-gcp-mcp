import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Prompt: faq_generator
 * Generate FAQ from existing wiki content
 */
export function registerFaqGeneratorPrompt(
	server: McpServer
) {
	server.prompt(
		"faq_generator",
		{
			topic: z.string().describe("The topic area to generate FAQ for"),
			numQuestions: z.number().min(3).max(10).optional().describe("Number of FAQ items to generate (default: 5)"),
		},
		({ topic, numQuestions }: { topic: string; numQuestions?: number }) => ({
			messages: [{
				role: "user",
				content: {
					type: "text",
					text: `Generate a FAQ section about "${topic}" based on our wiki content.
Process:
1. Search for pages related to "${topic}"
2. Retrieve the most relevant pages
3. Extract common questions and answers from the content
4. Create ${numQuestions || 5} FAQ items with:
   - Clear, concise questions
   - Accurate answers based on the wiki content
   - References to the source pages
Format as:
## Frequently Asked Questions: ${topic}
### Q1: [Question]
**A:** [Answer based on wiki content]
### Q2: [Question]
[Continue for ${numQuestions || 5} questions]
Include a "Source Pages" section at the end listing which wiki pages were used.`
				}
			}]
		})
	);
}
