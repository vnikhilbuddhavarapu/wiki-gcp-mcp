/**
 * WikiJS GraphQL Client
 * Handles communication with WikiJS API using GraphQL queries
 * Includes structured logging for Workers observability
 */

export interface WikiPage {
  id: number;
  title: string;
  path: string;
  description?: string;
  content?: string;
  tags?: Array<{ tag: string }>;
  updatedAt?: string;
}

export interface WikiSearchResult {
  id: number;
  title: string;
  path: string;
  description: string;
}

interface WikiSearchResponse {
  pages: {
    search: {
      results: WikiSearchResult[];
    };
  };
}

interface WikiListResponse {
  pages: {
    list: WikiPage[];
  };
}

interface WikiGetResponse {
  pages: {
    single: WikiPage | null;
  };
}

interface LogContext {
  operation: string;
  requestId: string;
  [key: string]: unknown;
}

/**
 * Logger utility for structured logging in Workers environment
 */
class Logger {
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  private log(
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      message,
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("WARN", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("ERROR", message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("DEBUG", message, context);
  }
}

/**
 * WikiJS GraphQL Client
 */
export class WikiJSClient {
  private baseUrl: string;
  private apiKey: string;
  private logger: Logger;

  constructor(baseUrl: string, apiKey: string, requestId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.logger = new Logger(requestId);
    this.logger.info("WikiJSClient initialized", {
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
    });
  }

  /**
   * Execute GraphQL query against WikiJS API
   */
  private async graphqlQuery<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string,
  ): Promise<T> {
    const startTime = Date.now();
    const context: LogContext = {
      operation: operationName || "graphql_query",
      requestId: this.logger["requestId"],
    };

    this.logger.debug("GraphQL request starting", {
      ...context,
      endpoint: `${this.baseUrl}/graphql`,
      hasVariables: !!variables,
    });

    try {
      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error("GraphQL HTTP error", {
          ...context,
          status: response.status,
          statusText: response.statusText,
          duration,
          errorPreview: errorText.substring(0, 200),
        });
        throw new Error(
          `WikiJS API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = (await response.json()) as {
        data?: T;
        errors?: Array<{ message: string }>;
      };

      if (result.errors && result.errors.length > 0) {
        this.logger.error("GraphQL query error", {
          ...context,
          duration,
          errors: result.errors.map((e) => e.message),
        });
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      if (!result.data) {
        this.logger.error("GraphQL empty response", { ...context, duration });
        throw new Error("No data returned from WikiJS");
      }

      this.logger.info("GraphQL request completed", {
        ...context,
        duration,
        hasData: !!result.data,
      });

      return result.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("GraphQL request failed", {
        ...context,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search pages in WikiJS using keywords
   */
  async searchPages(query: string, limit = 10): Promise<WikiPage[]> {
    this.logger.info("Searching pages", { query, limit });

    const graphqlQuery = `
			query SearchPages($query: String!, $limit: Int!) {
				pages {
					search(query: $query, limit: $limit) {
						results {
							id
							title
							path
							description
						}
					}
				}
			}
		`;

    const data = await this.graphqlQuery<WikiSearchResponse>(
      graphqlQuery,
      { query, limit },
      "searchPages",
    );
    const pages = data.pages.search.results.map((result) => ({
      id: result.id,
      title: result.title,
      path: result.path,
      description: result.description,
    }));

    this.logger.info("Search completed", { query, resultCount: pages.length });
    return pages;
  }

  /**
   * List all pages in WikiJS
   */
  async listPages(limit = 20): Promise<WikiPage[]> {
    this.logger.info("Listing pages", { limit });

    const graphqlQuery = `
			query ListPages($limit: Int!) {
				pages {
					list(limit: $limit) {
						id
						title
						path
						updatedAt
					}
				}
			}
		`;

    const data = await this.graphqlQuery<WikiListResponse>(
      graphqlQuery,
      { limit },
      "listPages",
    );

    this.logger.info("List completed", { resultCount: data.pages.list.length });
    return data.pages.list;
  }

  /**
   * Get a specific page by ID
   */
  async getPage(pageId: string | number): Promise<WikiPage | null> {
    const id = typeof pageId === "string" ? parseInt(pageId, 10) : pageId;

    if (isNaN(id)) {
      this.logger.error("Invalid page ID", { pageId });
      throw new Error(`Invalid page ID: ${pageId}`);
    }

    this.logger.info("Getting page", { id });

    const graphqlQuery = `
			query GetPage($id: Int!) {
				pages {
					single(id: $id) {
						id
						title
						path
						content
						description
						tags {
							tag
						}
						updatedAt
					}
				}
			}
		`;

    const data = await this.graphqlQuery<WikiGetResponse>(
      graphqlQuery,
      { id },
      "getPage",
    );

    if (data.pages.single) {
      this.logger.info("Page found", { id, title: data.pages.single.title });
    } else {
      this.logger.warn("Page not found", { id });
    }

    return data.pages.single;
  }

  /**
   * Create a new page in WikiJS
   */
  async createPage(
    title: string,
    path: string,
    content: string,
    description: string = "",
    tags: string[] = [],
  ): Promise<WikiPage> {
    this.logger.info("Creating page", { title, path });

    const graphqlMutation = `
      mutation CreatePage(
        $title: String!
        $path: String!
        $content: String!
        $description: String!
        $tags: [String]!
      ) {
        pages {
          create(
            title: $title
            path: $path
            content: $content
            editor: "markdown"
            isPublished: true
            isPrivate: false
            locale: "en"
            description: $description
            tags: $tags
          ) {
            responseResult {
              succeeded
              message
            }
          }
        }
      }
    `;

    interface CreateResponse {
      pages: {
        create: {
          responseResult: {
            succeeded: boolean;
            message?: string;
          };
        };
      };
    }

    const data = await this.graphqlQuery<CreateResponse>(
      graphqlMutation,
      { title, path, content, description, tags },
      "createPage",
    );

    if (!data.pages.create.responseResult.succeeded) {
      throw new Error(
        `Create failed: ${data.pages.create.responseResult.message || "Unknown error"}`,
      );
    }

    // Fetch the created page by path to get full data
    const pages = await this.listPages(100);
    const createdPage = pages.find((p) => p.path === path);
    if (!createdPage) {
      throw new Error("Page created but could not retrieve page data");
    }

    // Get full page details
    const fullPage = await this.getPage(createdPage.id);
    if (!fullPage) {
      throw new Error("Page created but could not retrieve full page data");
    }

    this.logger.info("Page created", {
      id: fullPage.id,
      title: fullPage.title,
    });
    return fullPage;
  }

  /**
   * Update an existing page in WikiJS
   */
  async updatePage(
    id: number,
    title?: string,
    content?: string,
    description?: string,
    tags?: string[],
  ): Promise<WikiPage> {
    this.logger.info("Updating page", { id, title });

    const graphqlMutation = `
      mutation UpdatePage(
        $id: Int!
        $title: String
        $content: String
        $description: String
        $tags: [String]
      ) {
        pages {
          update(
            id: $id
            title: $title
            content: $content
            description: $description
            tags: $tags
          ) {
            responseResult {
              succeeded
              message
            }
          }
        }
      }
    `;

    interface UpdateResponse {
      pages: {
        update: {
          responseResult: {
            succeeded: boolean;
            message?: string;
          };
        };
      };
    }

    const data = await this.graphqlQuery<UpdateResponse>(
      graphqlMutation,
      {
        id,
        ...(title && { title }),
        ...(content && { content }),
        ...(description && { description }),
        tags: tags || [],
      },
      "updatePage",
    );

    if (!data.pages.update.responseResult.succeeded) {
      throw new Error(
        `Update failed: ${data.pages.update.responseResult.message || "Unknown error"}`,
      );
    }

    // Fetch the updated page to return full data
    const updatedPage = await this.getPage(id);
    if (!updatedPage) {
      throw new Error("Page updated but could not retrieve updated data");
    }

    this.logger.info("Page updated", {
      id: updatedPage.id,
      title: updatedPage.title,
    });
    return updatedPage;
  }

  /**
   * Delete a page in WikiJS
   */
  async deletePage(id: number): Promise<boolean> {
    this.logger.info("Deleting page", { id });

    const graphqlMutation = `
      mutation DeletePage($id: Int!) {
        pages {
          delete(id: $id) {
            responseResult {
              succeeded
              message
            }
          }
        }
      }
    `;

    interface DeleteResponse {
      pages: {
        delete: {
          responseResult: {
            succeeded: boolean;
            message?: string;
          };
        };
      };
    }

    const data = await this.graphqlQuery<DeleteResponse>(
      graphqlMutation,
      { id },
      "deletePage",
    );

    const succeeded = data.pages.delete.responseResult.succeeded;
    if (succeeded) {
      this.logger.info("Page deleted", { id });
    } else {
      this.logger.error("Failed to delete page", {
        id,
        message: data.pages.delete.responseResult.message,
      });
    }
    return succeeded;
  }
}
