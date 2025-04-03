import WebSocket from 'ws'; // Use the 'ws' library for WebSocket client
import { logger } from '../utils/index.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js'; // Might need config later
import { v4 as uuidv4 } from 'uuid'; // For generating unique request IDs

// Define a more specific type for expected C# CommandResponse structure
interface UnityCommandResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    // Add correlationId if C# bridge includes it in responses
    // correlationId?: string;
}

// Structure to hold pending request promises
interface PendingRequest {
    resolve: (value: UnityCommandResponse) => void;
    reject: (reason?: any) => void;
    timer: NodeJS.Timeout;
}

const LOG_PREFIX = "[UnityBridgeClient] ";
const RECONNECT_DELAY_MS = 5000;
const PING_INTERVAL_MS = 25000; // Send pings to keep connection alive/check status
const COMMAND_TIMEOUT_MS = 15000; // Timeout for waiting for a response (increased slightly)

export class UnityBridgeClient {
    private ws: WebSocket | null = null;
    private connectionUrl: string;
    private isConnectedFlag = false;
    private reconnectTimeoutId: NodeJS.Timeout | null = null;
    private pingIntervalId: NodeJS.Timeout | null = null;
    // Map request IDs to their promise resolve/reject functions
    private responsePromises = new Map<string, PendingRequest>();

    constructor() {
        // TODO: Make port configurable via ConfigurationManager
        const port = 8765; // Default port matching C# bridge
        this.connectionUrl = `ws://127.0.0.1:${port}/mcp`;
        logger.info(LOG_PREFIX + "Initializing...");
        this.connect();
    }

    public isConnected(): boolean {
        return this.isConnectedFlag && this.ws?.readyState === WebSocket.OPEN;
    }

    private connect(): void {
        // Clear any pending reconnect timer
        this.clearReconnectTimer();

        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            logger.debug(LOG_PREFIX + "Connection attempt ignored, already connected or connecting.");
            return;
        }

        logger.info(LOG_PREFIX + `Attempting to connect to Unity Bridge at ${this.connectionUrl}...`);
        // Clean up previous socket if it exists
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.terminate(); // Force close previous socket
        }

        this.ws = new WebSocket(this.connectionUrl);

        this.ws.on('open', () => {
            logger.info(LOG_PREFIX + "Successfully connected to Unity Bridge.");
            this.isConnectedFlag = true;
            this.startPing();
        });

        this.ws.on('message', (data) => {
            // Add explicit type for data (Buffer)
            this.handleMessage(data as Buffer);
        });

        // Add explicit type for pong payload (Buffer)
        this.ws.on('pong', (payload: Buffer) => {
            logger.debug(LOG_PREFIX + `Received pong from Unity Bridge. Payload: ${payload.toString()}`);
            // Can be used to confirm connection health
        });

        // Add explicit types for code (number) and reason (Buffer)
        this.ws.on('close', (code: number, reason: Buffer) => {
            const reasonStr = reason?.toString() || "No reason provided";
            logger.warn(LOG_PREFIX + `Connection closed. Code: ${code}, Reason: ${reasonStr}`);
            this.handleDisconnect("Connection closed");
        });

        // Add explicit type for error (Error)
        this.ws.on('error', (error: Error) => {
            logger.error(LOG_PREFIX + `Connection error: ${error.message}`);
            this.handleDisconnect(`Connection error: ${error.message}`);
            // No need to schedule reconnect here, 'close' event should handle it
        });
    }

    private handleDisconnect(reason: string): void {
        if (!this.isConnectedFlag && this.reconnectTimeoutId) {
            // Already handling disconnect / trying to reconnect
            return;
        }
        this.isConnectedFlag = false;
        this.stopPing();
        this.rejectPendingPromises(reason);
        this.ws?.removeAllListeners(); // Clean up listeners
        this.ws?.terminate(); // Ensure socket is closed
        this.ws = null;
        this.scheduleReconnect();
    }


    private scheduleReconnect(): void {
        this.clearReconnectTimer(); // Clear existing timer if any
        if (!this.isConnectedFlag) { // Only schedule if not connected
            logger.info(LOG_PREFIX + `Scheduling reconnect in ${RECONNECT_DELAY_MS / 1000} seconds...`);
            this.reconnectTimeoutId = setTimeout(() => {
                this.reconnectTimeoutId = null; // Clear timer ID before attempting connect
                this.connect();
            }, RECONNECT_DELAY_MS);
        }
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }

    private startPing(): void {
        this.stopPing(); // Clear existing interval if any
        logger.debug(LOG_PREFIX + "Starting WebSocket ping interval.");
        this.pingIntervalId = setInterval(() => {
            if (this.isConnected()) {
                logger.debug(LOG_PREFIX + "Sending ping to Unity Bridge.");
                // Add explicit type for err (Error | undefined)
                this.ws?.ping((err: Error | undefined) => {
                    if (err) {
                        logger.error(LOG_PREFIX + "Ping failed:", err);
                        // Consider triggering reconnect on ping failure after retries?
                    }
                });
            } else {
                logger.warn(LOG_PREFIX + "Skipping ping, not connected.");
                // Ensure reconnect is scheduled if ping fails due to disconnection
                if (!this.reconnectTimeoutId) {
                    this.scheduleReconnect();
                }
            }
        }, PING_INTERVAL_MS);
    }

    private stopPing(): void {
        if (this.pingIntervalId) {
            logger.debug(LOG_PREFIX + "Stopping WebSocket ping interval.");
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    }

    // Add explicit type for data (Buffer)
    private handleMessage(data: Buffer): void {
        let response: UnityCommandResponse | null = null;
        let correlationId: string | null = null; // Assuming responses might include a correlation ID

        try {
            const messageString = data.toString();
            logger.debug(LOG_PREFIX + `Received message: ${messageString}`);
            response = JSON.parse(messageString);

            // TODO: Extract correlationId from response if C# bridge adds it
            // correlationId = response?.correlationId;

        } catch (error) {
            logger.error(LOG_PREFIX + `Error parsing message: ${error instanceof Error ? error.message : error}`);
            // Cannot correlate if parsing failed
            return;
        }

        // TODO: Use actual correlationId for matching
        // Temporary: Use the first key as the correlation ID (highly unreliable)
        correlationId = this.responsePromises.size > 0 ? [...this.responsePromises.keys()][0] : null;

        if (correlationId && this.responsePromises.has(correlationId)) {
            const promiseCallbacks = this.responsePromises.get(correlationId);
            if (promiseCallbacks) {
                clearTimeout(promiseCallbacks.timer); // Clear the timeout timer
                if (response !== null) { // Check if response is not null before resolving
                    promiseCallbacks.resolve(response); // Resolve the promise
                } else {
                    // This case should ideally not happen if parsing succeeded but yielded null
                    logger.error(LOG_PREFIX + `Parsed response is null for request ID: ${correlationId}`);
                    promiseCallbacks.reject(new Error("Received null response after parsing."));
                }
                this.responsePromises.delete(correlationId); // Remove from map
                logger.debug(LOG_PREFIX + `Matched response to request ID: ${correlationId}`);
            }
        } else {
            logger.warn(LOG_PREFIX + `Received message with no matching pending promise (ID: ${correlationId}). Message: ${JSON.stringify(response)}`);
            // Handle unsolicited messages if necessary
        }
    }

    // Rejects all pending promises, e.g., on disconnect
    private rejectPendingPromises(reason: string): void {
        logger.warn(LOG_PREFIX + `Rejecting ${this.responsePromises.size} pending promises due to: ${reason}`);
        this.responsePromises.forEach((promiseCallbacks, requestId) => {
            clearTimeout(promiseCallbacks.timer);
            promiseCallbacks.reject(new Error(`Request failed: ${reason}`));
        });
        this.responsePromises.clear();
    }

    // Sends a command and returns a promise that resolves with the response
    public sendCommand(commandPayload: object): Promise<UnityCommandResponse> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) {
                logger.error(LOG_PREFIX + "SendCommand failed: Not connected.");
                return reject(new Error("Not connected to Unity Bridge."));
            }

            const requestId = uuidv4(); // Generate unique ID for this request
            const payloadWithId = { ...commandPayload, correlationId: requestId }; // Add ID to payload
            const commandString = JSON.stringify(payloadWithId);

            logger.debug(LOG_PREFIX + `Sending command (ID: ${requestId}): ${commandString.substring(0, 200)}...`); // Log truncated

            const timer = setTimeout(() => {
                this.responsePromises.delete(requestId);
                logger.error(LOG_PREFIX + `Command timed out (ID: ${requestId})`);
                reject(new Error(`Command (ID: ${requestId}) timed out after ${COMMAND_TIMEOUT_MS}ms`));
            }, COMMAND_TIMEOUT_MS);

            // Store the promise callbacks keyed by request ID
            this.responsePromises.set(requestId, { resolve, reject, timer });

            // Send the command
            // Add explicit type for error (Error | undefined)
            this.ws?.send(commandString, (error: Error | undefined) => {
                if (error) {
                    clearTimeout(timer); // Clear timer on send error
                    this.responsePromises.delete(requestId); // Remove promise
                    logger.error(LOG_PREFIX + `Error sending command (ID: ${requestId}): ${error.message}`);
                    reject(error); // Reject the promise
                } else {
                    logger.debug(LOG_PREFIX + `Command sent successfully (ID: ${requestId})`);
                }
            });
        });
    }

    // Graceful shutdown
    public close(): void {
        logger.info(LOG_PREFIX + "Closing connection...");
        this.clearReconnectTimer();
        this.stopPing();
        this.rejectPendingPromises("Connection closing.");
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws.terminate(); // Force close if needed
        }
        this.ws = null;
        this.isConnectedFlag = false;
        logger.info(LOG_PREFIX + "Connection closed.");
    }
}
