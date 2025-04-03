import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConfigurationManager } from "../config/ConfigurationManager.js";
import { logger } from "../utils/index.js";
import { UnityBridgeClient } from "../services/UnityBridgeClient.js"; // Import client type

// Import tool registration functions
import { exampleTool } from "./exampleTool.js";
import { pingUnityBridgeTool } from "./pingUnityBridgeTool.js";
import { manageAssetTool } from "./manageAssetTool.js";
import { manageGameObjectTool } from "./manageGameObjectTool.js";
import { manageSceneTool } from "./manageSceneTool.js"; // Import the manage_scene tool
// import { yourTool } from "./yourTool.js"; // Add new tool imports here

/**
 * Register all defined tools with the MCP server instance.
 * This function centralizes tool registration logic.
 * @param server The McpServer instance.
 * @param unityBridgeClient The initialized UnityBridgeClient instance.
 */
export function registerTools(server: McpServer, unityBridgeClient: UnityBridgeClient): void {
    logger.info("Registering tools");
    const configManager = ConfigurationManager.getInstance();

    // Register each tool, passing necessary config or services
    exampleTool(server, configManager.getExampleServiceConfig());
    // Ensure pingUnityBridgeTool receives the client instance
    pingUnityBridgeTool(server, unityBridgeClient);
    // Register the manage_asset tool
    manageAssetTool(server, unityBridgeClient);
    // Register the manage_gameobject tool
    manageGameObjectTool(server, unityBridgeClient);
    // Register the manage_scene tool
    manageSceneTool(server, unityBridgeClient);
    // yourTool(server, configManager.getYourServiceConfig()); // Add new tool registrations

    logger.info("All tools registered");
}
