import {createServer} from "http";
import {Server} from "http";
import {AddressInfo} from "node:net";
import * as crypto from "crypto";
const PORT = 0

class WebsocketClient {
    server: Server;
    constructor() {
        const server =createServer((req, res) => {
            res.writeHead(200);
            res.end('Hello World!');
        })

        server.on('upgrade', (req, socket, head) => {
            // Check for WebSocket headers
            if (req.headers['upgrade'] !== 'websocket') {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
                return;
            }

            // Handle WebSocket handshake
            const acceptKey = req.headers['sec-websocket-key'];
            const hash = crypto
                .createHash('sha1')
                .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
                .digest('base64');

            // Send response for WebSocket upgrade
            const responseHeaders = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${hash}`,
            ];
            socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

            // Handle WebSocket messages
            socket.on('data', (buffer) => {
                // Decode WebSocket frame (simple text message)
                const message = buffer.toString('utf8', 2, buffer.length - 1);
                console.log('Received:', message);

                // Send a response back
                const reply = Buffer.from(`\x81${String.fromCharCode(message.length)}${message}`);
                socket.write(reply);
            });

            socket.on('end', () => {
                console.log('Client disconnected');
            });
        });

        server.listen(PORT,() => {
            console.log(`Client started on port: ${(server.address() as AddressInfo)?.port}`);
        })

        this.server = server
    }
}
export default WebsocketClient