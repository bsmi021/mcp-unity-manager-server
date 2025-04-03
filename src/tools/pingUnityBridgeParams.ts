import { z } from 'zod';

export const TOOL_NAME = "ping_unity_bridge";

export const TOOL_DESCRIPTION = `Sends a simple 'ping' command to the connected C# Unity Bridge component.
Useful for verifying the connection and basic communication channel.
Optionally accepts a payload object which will be echoed back in the 'data' field of the response if successful.`;

// Parameters for the ping tool
export const TOOL_PARAMS = {
    payload: z.record(z.any()).optional().describe("Optional JSON object to send with the ping. It will be echoed back by the C# bridge in the response data if the ping is successful.")
};

// Optional: Define a Zod schema for the entire input object if needed later
// export const pingUnityBridgeInputSchema = z.object(TOOL_PARAMS);
