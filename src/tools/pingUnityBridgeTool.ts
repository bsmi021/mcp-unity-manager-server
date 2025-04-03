import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS } from "./pingUnityBridgeParams.js";
import { logger } from "../utils/index.js";
// Placeholder for the actual client implementation
import { UnityBridgeClient } from "../services/UnityBridgeClient.js"; // Assuming this path

// Define a schema constant for clarity
const PingUnityBridgeSchema = z.object(TOOL_PARAMS);
// Define the type for the arguments based on the schema
type PingUnityBridgeArgs = z.infer<typeof PingUnityBridgeSchema>;

// Accept the client instance
export const pingUnityBridgeTool = (server: McpServer, unityBridgeClient: UnityBridgeClient): void => {

    const processPingRequest = async (args: PingUnityBridgeArgs) => {
        logger.debug(`Received ${TOOL_NAME} request`, { args });

        // Check if client is connected
        if (!unityBridgeClient || !unityBridgeClient.isConnected()) {
            logger.error("Unity Bridge client is not connected.");
            throw new McpError(ErrorCode.InternalError, "Unity Bridge client is not available or not connected.");
        }

        // Mock implementation removed.

        // The actual implementation
        try {
            // Construct the command payload to send to C#
            const commandPayload = {
                command: "ping",
                parameters: args.payload || {} // Send payload if provided, else empty object
            };

            // Send the command via the client and wait for the response
            // The client needs to handle sending, receiving the response, and potential timeouts
            const responseJson = await unityBridgeClient.sendCommand(commandPayload);

            // Assuming responseJson is the parsed JSON object from CommandResponse
            if (responseJson.success) {
                logger.info("Ping successful", { responseData: responseJson.data });
                return {
                    content: [{
                        type: "text" as const,
                        // Return the echoed payload from C# bridge's data field
                        text: `Pong! Bridge responded successfully.${responseJson.message ? ` Message: ${responseJson.message}` : ''}\nEchoed Payload: ${JSON.stringify(responseJson.data, null, 2)}`
                    }]
                };
            } else {
                logger.error("Ping failed on Unity side", { error: responseJson.error });
                throw new McpError(ErrorCode.InternalError, `Unity Bridge Error: ${responseJson.error || 'Unknown error from bridge'}`);
            }

        } catch (error) { // Catch block for the actual implementation
            // Handle errors from sendCommand (e.g., timeouts, connection issues) or McpErrors re-thrown
            logger.error(`Error processing ${TOOL_NAME}`, { error: error, args }); // Pass error object itself
            if (error instanceof McpError) {
                throw error; // Re-throw known MCP errors
            }
            // Check if it's a standard Error before accessing message
            const errorMessage = error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME}.`;
            // Generic internal error for unexpected issues
            throw new McpError(
                ErrorCode.InternalError,
                errorMessage
            );
        } // End of catch block
    }; // End of processPingRequest

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS,
        processPingRequest
    );

    logger.info("Tool registered", { toolName: TOOL_NAME });
};
