import * as net from 'net';
import * as crypto from 'crypto';
import WebSocketBase from "./websocket-base";
import DataFrameReader from "./dataFrame";

interface WebsocketClientEventMap {
    message: any;
    close: any;
}

class WebSocketClient extends WebSocketBase {
    private socket: net.Socket;
    private isConnected: boolean = false;
    public id: string = null;
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
            const key = crypto.randomBytes(16).toString('base64');
            this.id = key;
            const requestHeaders = [
                `GET ${path} HTTP/1.1`,
                `Host: ${host}:${port}`,
                `Upgrade: websocket`,
                `Connection: Upgrade`,
                `Sec-WebSocket-Key: ${key}`,
                `Sec-WebSocket-Version: 13`,
                '',
                ''
            ];

            this.socket = new net.Socket();

            this.socket.connect(port, host, () => {
                console.log('Connecting to server...');
                this.socket.write(requestHeaders.join('\r\n'));
            });

            const dataFrameReader = new DataFrameReader([]);
            this.socket.on('data', (data) => {
                const response = data.toString();

                if (response.includes('101 Switching Protocols')) {
                    console.log('Connect to server successfully');
                    this.isConnected = true;
                    resolve();
                    return;
                }

                dataFrameReader.add(data);
                this.emit('message', this.extractMessage(dataFrameReader));
            });
            this.socket.on('close', (err) => {
                this.emit('close')
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

    on<Event extends keyof WebsocketClientEventMap>(
        event: Event,
        listener: (args: WebsocketClientEventMap[Event]) => void
    ): this {
        return super.on(event, listener);
    }



    close(): void {
        if (this.socket) {
            this.sendMessage(JSON.stringify({ type: 'disconnect' }));
            this.socket.destroy();
            this.isConnected = false;
        }
    }
}


export default WebSocketClient