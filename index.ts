import {createServer} from 'http';
import * as crypto from 'crypto';
import {IncomingMessage} from "node:http";
import {Duplex} from "node:stream";

const PORT = 1337

const FIRST_BIT = 128;

const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

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
    console.log(lengthIndicatorInBits);
    // const messageLength = parseInt((lengthIndicatorInBits).toString().padStart(8,'0'), 2)
    // console.log({messageLength})
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