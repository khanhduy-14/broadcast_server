import {createServer} from 'http';
import {Duplex} from "node:stream";
import WebsocketServer from "./websocket-server";

const PORT = 1337
const MAXIMUM_SIXTEEN_BITS_INTEGER = 2 ** 16
const MAXIMUM_SIXTYFOUR_BITS_INTEGER = 2 ** 64
const SEVEN_BITS_INTEGER_MARKER = 125;
const SIXTEEN_BITS_INTEGER_MARKER = 126;
const SIXTYFOUR_BITS_INTEGER_MARKER = 127;
const OPCODE_TEXT = 0x01;

function  sendMessage(msg: any, socket: Duplex) {
    const dataFrameBuffer = prepareMessage(msg);
    socket.write(dataFrameBuffer);
}

function concat(bufferList: Buffer[], totalLength: number){
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;

    for (const buffer of bufferList){
        target.set(buffer, offset);
        offset += buffer.length;

    }
    return target;
}

function prepareMessage (message: any) {
    const msg = Buffer.from(message);
    const messageSize =  msg.length;
    let dataFrameBuffer: Buffer;
    const firstByte = 0x80 | OPCODE_TEXT;
    if(messageSize <= SEVEN_BITS_INTEGER_MARKER) {
        dataFrameBuffer = Buffer.from([firstByte].concat(messageSize))
    }
    else if (messageSize <= MAXIMUM_SIXTEEN_BITS_INTEGER) {
        const offsetFourBytes = 4
        const target = Buffer.allocUnsafe(offsetFourBytes)
        target[0] = firstByte
        target[1] = SIXTEEN_BITS_INTEGER_MARKER | 0x00

        target.writeUint16BE(messageSize, 2)

        dataFrameBuffer = target
    } else if (messageSize <= MAXIMUM_SIXTYFOUR_BITS_INTEGER) {
        const offsetTenBytes = 10
        const target = Buffer.allocUnsafe(offsetTenBytes);
        target[0] = firstByte
        target[1] = SIXTYFOUR_BITS_INTEGER_MARKER | 0x00;
        target.writeBigUInt64BE(BigInt(messageSize), 2)
        dataFrameBuffer = target;
    }
    else {
        throw new Error(`Can't sending your message too long`);
    }
    const totalLength = dataFrameBuffer.byteLength + messageSize;
    return concat([dataFrameBuffer, msg], totalLength);
}




const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World!');
}).listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

const socket = new WebsocketServer(server);

socket.on('message', ({message, clientSocketKey}) => {
    console.log({
        clientSocketKey, message
    })
})

    ;[
    "uncaughtException",
    "unhandledRejection"
].forEach(event =>
    process.on(event, (err) => {
        console.error(`Error: ${event}, Message: ${err.stack || err}`)
    })
)


