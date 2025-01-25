import {IncomingMessage, Server} from "node:http";
import {Duplex} from "node:stream";
import DataFrameReader from "./dataFrame";
import * as crypto from "crypto";
import {SOCKET_CONSTANT} from "./constant";
import WebSocketBase from "./websocket-base";


interface WebsocketServerEventMap {
    message: { clientSocketKey: string; message: string };
}
class WebsocketServer extends WebSocketBase{
    server: Server;
    clientSocketMap: Map<string, Duplex>;
    constructor(server: Server) {
        super()
        this.server = server;
        this.server.on('upgrade', this.onSocketUpgrade.bind(this));
        this.clientSocketMap = new Map();
    }
    private createSocketAccept (id : string){
        const hash = crypto.createHash('sha1');
        hash.update(id + SOCKET_CONSTANT.MAGIC_STRING)
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

        this.clientSocketMap.set(clientSocketKey, socket);

        const dataFrameReader = new DataFrameReader([]);
        socket.on('data', (chunk) => {
            dataFrameReader.add(chunk);
            const message = this.extractMessage(dataFrameReader);
            if(!message) return;
            this.emit('message',{clientSocketKey, message});
        })
    }

    send (clientId: string, message: string)  {
        const socket = this.clientSocketMap.get(clientId);
        if(!socket) return;

        return socket.write(this.prepareMessage(message, true));
    }



    on<Event extends keyof WebsocketServerEventMap>(
        event: Event,
        listener: (args: WebsocketServerEventMap[Event]) => void
    ): this {
        return super.on(event, listener);
    }

}

export default WebsocketServer;