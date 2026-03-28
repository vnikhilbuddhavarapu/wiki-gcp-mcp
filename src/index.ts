import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { WikiJSClient } from "./wikijs-client";
import { generateRequestId, MCPLogger } from "./shared/utils";

/**
 * Import all tools
 */
import {
  registerSearchPagesTool,
  registerListPagesTool,
  registerGetPageTool,
  registerGetPageByPathTool,
  registerCreatePageTool,
  registerUpdatePageTool,
  registerDeletePageTool,
  registerListTagsTool,
  registerSearchByTagTool,
  registerRecentChangesTool,
  registerPageHistoryTool,
  registerWikiStatsTool,
  registerCreateSummaryTool,
  registerFindRelatedPagesTool,
  registerExploreKnowledgeGraphTool,
  registerExportPageTool,
} from "./tools";

/**
 * Import all prompts
 */
import {
  registerSearchGuidePrompt,
  registerNewPageTemplatePrompt,
  registerKnowledgeExplorerPrompt,
  registerDocumentationReviewPrompt,
  registerFaqGeneratorPrompt,
} from "./prompts";

/**
 * Import all resources
 */
import {
  registerPagesResource,
  registerPageByIdResource,
  registerTagsResource,
  registerRecentChangesResource,
  registerStatsResource,
} from "./resources";

/**
 * MCP Agent for WikiJS integration
 * Provides tools, prompts, and resources for WikiJS integration
 */
export class WikiJSMCP extends McpAgent<
  Env,
  Record<string, never>,
  Record<string, never>
> {
  server = new McpServer({
    name: "WikiJS MCP",
    version: "1.0.0",
  });

  async init() {
    const requestId = generateRequestId();
    const logger = new MCPLogger(requestId);

    /**
     * Validate environment configuration
     */
    const wikiBaseUrl = this.env.WIKI_JS_BASE_URL;
    const wikiApiKey = this.env.WIKI_JS_API_KEY;

    if (!wikiBaseUrl || !wikiApiKey) {
      logger.error("Missing required environment variables", {
        hasBaseUrl: !!wikiBaseUrl,
        hasApiKey: !!wikiApiKey,
      });
      throw new Error(
        "Missing required environment variables: WIKI_JS_BASE_URL and WIKI_JS_API_KEY must be set",
      );
    }

    logger.info("Initializing WikiJS MCP", {
      wikiBaseUrl,
      hasApiKey: true,
    });

    /**
     * Initialize WikiJS client
     */
    const wikiClient = new WikiJSClient(wikiBaseUrl, wikiApiKey, requestId);

    /**
     * Register all 15 tools
     */
    logger.debug("Registering tools...");
    registerSearchPagesTool(this.server, wikiClient);
    registerListPagesTool(this.server, wikiClient);
    registerGetPageTool(this.server, wikiClient);
    registerGetPageByPathTool(this.server, wikiClient);
    registerCreatePageTool(this.server, wikiClient, wikiBaseUrl);
    registerUpdatePageTool(this.server, wikiClient);
    registerDeletePageTool(this.server, wikiClient);
    registerListTagsTool(this.server, wikiClient);
    registerSearchByTagTool(this.server, wikiClient);
    registerRecentChangesTool(this.server, wikiClient);
    registerPageHistoryTool(this.server, wikiClient);
    registerWikiStatsTool(this.server, wikiClient);
    registerCreateSummaryTool(this.server, wikiClient);
    registerFindRelatedPagesTool(this.server, wikiClient);
    registerExploreKnowledgeGraphTool(this.server, wikiClient);
    registerExportPageTool(this.server, wikiClient);

    /**
     * Register all 5 prompts
     */
    logger.debug("Registering prompts...");
    registerSearchGuidePrompt(this.server);
    registerNewPageTemplatePrompt(this.server);
    registerKnowledgeExplorerPrompt(this.server);
    registerDocumentationReviewPrompt(this.server);
    registerFaqGeneratorPrompt(this.server);

    /**
     * Register all 5 resources
     */
    logger.debug("Registering resources...");
    registerPagesResource(this.server, wikiClient, wikiBaseUrl);
    registerPageByIdResource(this.server, wikiClient, wikiBaseUrl);
    registerTagsResource(this.server, wikiClient);
    registerRecentChangesResource(this.server, wikiClient, wikiBaseUrl);
    registerStatsResource(this.server, wikiClient);

    logger.info("WikiJS MCP initialization complete", {
      toolsRegistered: 15,
      promptsRegistered: 5,
      resourcesRegistered: 5,
    });
  }
}

/**
 * Main fetch handler
 * Routes MCP requests to the Durable Object
 */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const requestId = generateRequestId();

    const logger = {
      info: (msg: string, ctx: Record<string, unknown>) =>
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            requestId,
            message: msg,
            ...ctx,
          }),
        ),
    };

    logger.info("Request received", {
      pathname: url.pathname,
      method: request.method,
    });

    if (url.pathname === "/mcp") {
      return WikiJSMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
