import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConfigurationManager } from "./config/ConfigurationManager.js";
import { registerTools } from "./tools/index.js";
import { logger } from "./utils/index.js";
import { UnityBridgeClient } from "./services/UnityBridgeClient.js"; // Import the client

/**
 * Creates and configures an MCP server instance.
 * This is the central function for server creation and tool registration.
 * @returns {McpServer} The configured MCP server instance
 */
export function createServer(): McpServer {
    logger.info("Creating MCP server instance");

    // Initialize the server
    const server = new McpServer({
        name: "mcp-server",
        version: "1.0.0",
        description: "MCP Server based on recommended practices"
    });

    // Get configuration
    // const configManager = ConfigurationManager.getInstance(); // Config not used directly here yet

    // Instantiate the Unity Bridge Client
    // This will automatically attempt to connect based on its constructor logic
    const unityBridgeClient = new UnityBridgeClient();

    // Register all tools, passing the client instance
    registerTools(server, unityBridgeClient);

    // TODO: Add graceful shutdown for the client when the server stops
    // server.on('close', () => unityBridgeClient.close());

    logger.info("MCP server instance created successfully");
    return server;
}
