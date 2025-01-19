import {IncomingMessage, Server} from "node:http";
import {Duplex} from "node:stream";
import DataFrameReader from "./dataFrame";
import DataFrame from "./dataFrame";
import * as crypto from "crypto";
import {EventEmitter} from "node:events";
import BufferReader from "./bufferReader";
import Utils from "./utils";
import {SocketEnum} from "./enum";
import {BYTE_CONSTANT} from "./constant";

const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

interface WebsocketServerEventMap {
    message: { clientSocketKey: string; message: string };
}
class WebsocketServer extends EventEmitter {
    server: Server;
    constructor(server: Server) {
        super()
        this.server = server;
        this.server.on('upgrade', this.onSocketUpgrade.bind(this));
    }
    private createSocketAccept (id : string){
        const hash = crypto.createHash('sha1');
        hash.update(id + WEBSOCKET_MAGIC_STRING);
        return hash.digest('base64');
    }



    private prepareHandshakeResponse (id: string){
        const acceptKey = this.createSocketAccept(id);
        return [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `sec-webSocket-accept: ${acceptKey}`,
            ''
        ].map(line => line.concat('\r\n')).join('')
    }

    private onSocketUpgrade  (req: IncomingMessage, socket: Duplex, head: Buffer)  {
        const  { 'sec-websocket-key': clientSocketKey} = req.headers
        const response = this.prepareHandshakeResponse(clientSocketKey)
        socket.write(response);

        const dataFrameReader = new DataFrameReader([]);
        socket.on('data', (chunk) => {
            dataFrameReader.add(chunk);
            const message = this.onHandleDataFrame(dataFrameReader, socket);
            if(!message) return;
            this.emit('message',{clientSocketKey, message});
        })
    }




    private onHandleDataFrame(dataFrameReader: DataFrame, socket: Duplex) {
        const {buffer, length: chunkLength} = dataFrameReader.getBuffer();
        const bufferReader = new BufferReader(buffer);
        bufferReader.read(1)
        const markerAndPayloadLength = bufferReader.read(1).readUInt8(0);

        const lengthIndicatorInBits = markerAndPayloadLength - BYTE_CONSTANT.FIRST_BIT_VALUE;

        let messageLength = 0;

        if (lengthIndicatorInBits <= SocketEnum.payloadLengthIndicator.sevenBits) {
            messageLength = lengthIndicatorInBits;
        } else if (lengthIndicatorInBits <= SocketEnum.payloadLengthIndicator.sixteenBits) {
            messageLength = bufferReader.read(2).readUInt16BE(0);
        } else if (lengthIndicatorInBits <= SocketEnum.payloadLengthIndicator.sixtyFourBits) {
            messageLength = Number(bufferReader.read(8).readBigUInt64BE(0));
        } else {
            throw new Error('Payload length is too large');
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
        const decoded = this.unmask(encoded, maskKey);
        const received = decoded.toString('utf-8');

        const data = Utils.isJsonString(received) ? JSON.parse(received) : received;
        dataFrameReader.remove(chunkLength)
        return data;

    }

    private unmask (encodedBuffer: any, maskKey: any) {
        const decoded = Uint8Array.from(encodedBuffer, (element, index) => element ^ maskKey[index % 4])

        return Buffer.from(decoded)
    }


    on<Event extends keyof WebsocketServerEventMap>(
        event: Event,
        listener: (args: WebsocketServerEventMap[Event]) => void
    ): this {
        return super.on(event, listener);
    }

}

export default WebsocketServer;