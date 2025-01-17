import {createServer} from 'http';
import * as crypto from 'crypto';
import {IncomingMessage} from "node:http";
import {Duplex} from "node:stream";
import BufferReader from "./bufferReader";
import DataFrameReader from "./dataFrame";
import DataFrame from "./dataFrame";
import dataFrame from "./dataFrame";

const PORT = 1337

const FIRST_BIT = 128;

const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const MAXIMUM_SIXTEEN_BITS_INTEGER = 2 ** 16
const MAXIMUM_SIXTYFOUR_BITS_INTEGER = 2 ** 64
const SEVEN_BITS_INTEGER_MARKER = 125;
const SIXTEEN_BITS_INTEGER_MARKER = 126;
const SIXTYFOUR_BITS_INTEGER_MARKER = 127;
const MASK_KEYS_BYTE_LENGTH = 4;
const OPCODE_TEXT = 0x01;

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

function onHandleDataFrame(dataFrameReader: DataFrame, socket: Duplex) {
    const {buffer, length: chunkLength} = dataFrameReader.getBuffer();
    const bufferReader = new BufferReader(buffer);
    bufferReader.read(1)
    const markerAndPayloadLength = bufferReader.read(1).readUInt8(0);

    const lengthIndicatorInBits = markerAndPayloadLength - FIRST_BIT;

    let messageLength = 0;

    if (lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
        messageLength = lengthIndicatorInBits;
    } else if (lengthIndicatorInBits <= SIXTEEN_BITS_INTEGER_MARKER) {
        messageLength = bufferReader.read(2).readUInt16BE(0);
    } else if (lengthIndicatorInBits <= SIXTYFOUR_BITS_INTEGER_MARKER) {
        messageLength = Number(bufferReader.read(8).readBigUInt64BE(0));
    } else {
        throw new Error('your message is too long');
    }
    const maskKey = bufferReader.read(4)

    if(messageLength !== bufferReader.get().length) {
        console.debug('Need more chunk data frame fragment');
        return;
    }
    if(dataFrameReader.get().length > 1) {
        console.debug('Data frame chunk assembled');
    }
    let encoded = bufferReader.read(messageLength);
    const decoded = unmask(encoded, maskKey);
    const received = decoded.toString('utf-8');

    const data = JSON.parse(received);
    dataFrameReader.remove(chunkLength)
    console.log('Message received', data);

    console.log('Sending message back');
    sendMessage(JSON.stringify(data), socket);
}

function unmask (encodedBuffer: any, maskKey: any) {
    const decoded = Uint8Array.from(encodedBuffer, (element, index) => element ^ maskKey[index % 4])

    return Buffer.from(decoded)
}

function onSocketUpgrade  (req: IncomingMessage, socket: Duplex, head: Buffer)  {
    const  { 'sec-websocket-key': clientSocketKey} = req.headers
    const response = prepareHandshakeResponse(clientSocketKey)
    socket.write(response);

    const dataFrameReader = new DataFrameReader([]);
    socket.on('data', (chunk) => {
        dataFrameReader.add(chunk);
        onHandleDataFrame(dataFrameReader, socket);
    })
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


