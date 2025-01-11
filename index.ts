import {createServer} from 'http';
import * as crypto from 'crypto';
import {IncomingMessage} from "node:http";
import {Duplex} from "node:stream";

const PORT = 1337

const FIRST_BIT = 128;

const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const SEVEN_BITS_INTEGER_MARKER = 125;
const SIXTEEN_BITS_INTEGER_MARKER = 126;
const SIXTYFOUR_BITS_INTEGER_MARKER = 127;
const MASK_KEYS_BYTE_LENGTH = 4;
function createSocketAccept (id : string){
    const hash = crypto.createHash('sha1');
    hash.update(id+ WEBSOCKET_MAGIC_STRING);
    return hash.digest('base64');
}

function prepareHandshakeResponse (id: string){
    const acceptKey = createSocketAccept(id);
    return [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `sec-webSocket-accept: ${acceptKey}`,
        ''
    ].map(line => line.concat('\r\n')).join('')
}

function onSocketReadable(socket: Duplex) {
    socket.read(1);

    const [markerAndPayloadLength] = socket.read(1);

    const lengthIndicatorInBits = markerAndPayloadLength - FIRST_BIT;

    let messageLength= 0;

    if(lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
        messageLength = lengthIndicatorInBits;
    }
    else {
        throw  new Error('your message is too long');
    }

    const maskKey = socket.read(MASK_KEYS_BYTE_LENGTH);
    const encoded = socket.read(messageLength);

    console.log({
        maskKey,
        encoded,
    })
}

function onSocketUpgrade  (req: IncomingMessage, socket: Duplex, head: Buffer)  {
    const  { 'sec-websocket-key': clientSocketKey} = req.headers
    const response = prepareHandshakeResponse(clientSocketKey)
    socket.write(response);

    socket.on('readable', () => onSocketReadable(socket))

}
const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World!');
}).listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});


server.on('upgrade', onSocketUpgrade)

    ;[
    "uncaughtException",
    "unhandledRejection"
].forEach(event =>
    process.on(event, (err) => {
        console.error(`Error: ${event}, Message: ${err.stack || err}`)
    })
)