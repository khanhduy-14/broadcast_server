import * as net from 'net';
import * as crypto from 'crypto';
import WebSocketBase from "./websocket-base";
import DataFrameReader from "./dataFrame";

class WebSocketClient extends WebSocketBase {
    private socket: net.Socket;
    private isConnected: boolean = false;

    constructor() {
        super();
    }

    /**
     * Create a WebSocket connection to a server
     * @param host Server hostname
     * @param port Server port
     * @param path WebSocket path
     */

    async connect(host: string, port: number, path: string = '/'): Promise<void> {
        return new Promise((resolve, reject) => {
            // Generate a random key for the WebSocket handshake
            const key = crypto.randomBytes(16).toString('base64');

            // Create the WebSocket handshake headers
            const requestHeaders = [
                `GET ${path} HTTP/1.1`,
                `Host: ${host}:${port}`,
                `Upgrade: websocket`,
                `Connection: Upgrade`,
                `Sec-WebSocket-Key: ${key}`,
                `Sec-WebSocket-Version: 13`,
                '', // Empty line to end headers
                ''  // Additional empty line required by WebSocket protocol
            ];

            this.socket = new net.Socket();

            this.socket.connect(port, host, () => {
                console.log('Connected to server, sending handshake');
                this.socket.write(requestHeaders.join('\r\n'));
            });

            const dataFrameReader = new DataFrameReader([]);
            this.socket.on('data', (data) => {
                const response = data.toString();

                // Check if the handshake was successful
                if (response.includes('101 Switching Protocols')) {
                    console.log('WebSocket handshake successful');
                    this.isConnected = true;
                    resolve();
                    return;
                }

                dataFrameReader.add(data);
                console.log(dataFrameReader)
                const message = this.extractMessage(dataFrameReader);
                console.log('da vao duoc response', message)
            });

            this.socket.on('error', (err) => {
                reject(err);
            });
        });
    }


    /**
     * Send a string message over WebSocket
     * Implements basic WebSocket frame construction
     * @param message String message to send
     */
    sendMessage(message: string): void {
        if (!this.isConnected) {
            throw new Error('WebSocket not connected');
        }


        this.socket.write(this.prepareMessage(message, true));
    }

    /**
     * Close the WebSocket connection
     */
    close(): void {
        if (this.socket) {
            this.socket.destroy();
            this.isConnected = false;
        }
    }
}

// Example usage
async function main() {
    const client = new WebSocketClient();

    try {
        // Connect to WebSocket server
        await client.connect('localhost', 1337, '/');

        // Send a test message
        client.sendMessage('Hello, WebSocket Server!');

        // Optional: Send multiple messages
        client.sendMessage('This is a second message');

    } catch (err) {
        console.error('WebSocket connection error:', err);
    }
}

main();