import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Prompt: new_page_template
 * Template for creating new wiki pages with structure
 */
export function registerNewPageTemplatePrompt(server: McpServer) {
  server.prompt(
    "new_page_template",
    {
      pageTitle: z.string().describe("The title of the new page"),
      pageType: z
        .enum(["documentation", "guide", "reference", "tutorial"])
        .describe("Type of page to create"),
    },
    ({ pageTitle, pageType }: { pageTitle: string; pageType: string }) => {
      const templates: Record<string, string> = {
        documentation: `# ${pageTitle}
## Overview
[Provide a brief overview of what this documentation covers]
## Prerequisites
- [List any prerequisites or requirements]
## Main Content
### Section 1
[Detailed explanation]
### Section 2
[Additional details]
## Examples
\`\`\`
[Code or usage examples]
## Related Pages
- [Link to related documentation]
## Tags
#documentation #api #reference`,
        guide: `# ${pageTitle}
## Goal
[What will the reader achieve by following this guide?]
## Steps
### Step 1: [First Action]
[Detailed instructions]
### Step 2: [Second Action]
### Step 3: [Third Action]
## Verification
[How to verify the guide was completed successfully]
## Troubleshooting
| Issue | Solution |
|-------|----------|
| [Common problem] | [Solution] |
#guide #tutorial #how-to`,
        reference: `# ${pageTitle}
## Quick Reference
| Field | Type | Description |
|-------|------|-------------|
| [field] | [type] | [description] |
## Details
[Comprehensive reference information]
## Usage Examples
[Example code or commands]
## See Also
- [Related reference materials]
#reference #api #documentation`,
        tutorial: `# ${pageTitle}
## What You'll Learn
- [Learning objective 1]
- [Learning objective 2]
- [Learning objective 3]
## Before You Start
[Prerequisites and setup needed]
## Tutorial
### Part 1: [Concept/Action]
[Explanation and instructions]
[Code example]
### Part 2: [Next Concept/Action]
### Part 3: [Final Concept/Action]
## Next Steps
[What to do after completing this tutorial]
#tutorial #learning #beginner`,
      };
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Create a new wiki page titled "${pageTitle}" as a ${pageType}. Use this template:
${templates[pageType] || templates.documentation}
Customize the content to fit your specific needs while maintaining this structure.`,
            },
          },
        ],
      };
    },
  );
}
