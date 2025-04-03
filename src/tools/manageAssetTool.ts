import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"; // Removed CallToolResponse
import { TOOL_NAME, TOOL_DESCRIPTION, ManageAssetParamsSchema, ManageAssetParams, TOOL_PARAMS } from "./manageAssetParams.js"; // Added TOOL_PARAMS import
import { UnityBridgeClient } from "../services/UnityBridgeClient.js";
import { logger } from "../utils/logger.js"; // Assuming logger exists

/**
 * Registers the manage_asset tool with the MCP server.
 * This tool interacts with the Unity Editor via the UnityBridgeClient to manage assets.
 *
 * @param server - The McpServer instance.
 * @param unityBridgeClient - The initialized UnityBridgeClient instance.
 */
export const manageAssetTool = (server: McpServer, unityBridgeClient: UnityBridgeClient): void => {

    /**
     * Processes the manage_asset tool request.
     * Sends the command to the Unity Bridge and handles the response.
     *
     * @param args - The validated tool parameters.
     * @returns A promise resolving to the CallToolResponse structure (type inferred).
     */
    const processRequest = async (args: ManageAssetParams) /* : Promise<CallToolResponse> */ => {
        logger.info(`[${TOOL_NAME}] Received request`, { action: args.action, path: args.path });

        try {
            // Send the command to the Unity Bridge as a single payload object
            // The client needs to handle sending, receiving the response, and potential timeouts
            const response = await unityBridgeClient.sendCommand({ command: TOOL_NAME, parameters: args });

            logger.info(`[${TOOL_NAME}] Response from Unity Bridge`, { response });

            // Check if the bridge indicated an error
            if (!response.success) {
                // Throwing an McpError will signal failure to the client calling the tool
                // Use InternalError as OperationFailed doesn't exist in the SDK enum
                throw new McpError(ErrorCode.InternalError, response.error || 'Unity Bridge reported an unspecified error.');
            }

            // Format the successful response for the MCP client
            return {
                content: [{
                    type: "text" as const,
                    // Assuming response.data contains relevant info, stringify it.
                    // Adjust based on actual data structure from C# CommandResponse.
                    text: JSON.stringify({
                        message: response.message || 'Operation successful.',
                        data: response.data
                    }, null, 2) // Pretty print JSON
                }]
            };
        } catch (error) {
            logger.error(`[${TOOL_NAME}] Error processing request`, { error });
            if (error instanceof McpError) {
                // Re-throw McpErrors directly (e.g., from bridge communication failure or thrown by sendCommand)
                throw error;
            } else if (error instanceof Error) {
                // Wrap other errors in McpError
                throw new McpError(ErrorCode.InternalError, `Failed to execute ${TOOL_NAME}: ${error.message}`);
            } else {
                // Handle unknown error types
                throw new McpError(ErrorCode.InternalError, `An unknown error occurred during ${TOOL_NAME} execution.`);
            }
        }
    };

    // Register the tool with the server
    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS, // Pass the raw parameter definition object
        processRequest
    );

    logger.info(`[Tool Registration] Registered tool`, { toolName: TOOL_NAME });
};
