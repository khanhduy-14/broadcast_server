import * as net from 'net'
import * as crypto from 'crypto'

// WebSocket handshake function
function createWebSocketConnection(host, port, path) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        // Generate a random key for the WebSocket handshake
        const key = crypto.randomBytes(16).toString('base64');

        // Create the WebSocket handshake headers
        const requestHeaders = [
            `GET ${path} HTTP/1.1`,
            `Host: ${host}:${port}/`,
            `Upgrade: websocket`,
            `Connection: Upgrade`,
            `Sec-WebSocket-Key: ${key}`,
            `Sec-WebSocket-Version: 13`,
            `\r\n`,
        ];

        console.log(requestHeaders.join('\r\n'))
        // Connect to the WebSocket server
        client.connect(port, host, () => {
            console.log('Connected to server, sending handshake');
            client.write(requestHeaders.join('\r\n'));
        });

        // Handle the server's response
        client.on('data', (data) => {
            const response = data.toString();

            // Check if the handshake was successful
            if (response.includes('101 Switching Protocols')) {
                console.log('WebSocket handshake successful');
                resolve(client);
            } else {
                reject(new Error('WebSocket handshake failed: ' + response));
            }
        });

        client.on('error', (err) => {
            reject(err);
        });

        client.on('end', () => {
            console.log('Disconnected from server');
        });
    });
}

(async () => {
    try {
        await createWebSocketConnection('localhost', 1337, '/');

    } catch (err) {
        console.error(err);
    }
})();
