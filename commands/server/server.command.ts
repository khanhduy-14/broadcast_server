    import {Command} from "commander";
    import WebsocketServer from "../../websocket-server";
    import {createServer} from "http";


    export default class ServerCommand {
        static get startServer() {
            return new Command("start-server")
                .description("Start broadcast server")
                .action(async () => {
                    const server = createServer((req, res) => {
                        res.writeHead(200);
                        res.end('BroadCast Channel Server!');
                    }).listen('1337', () => {
                        console.log(`Server is running at http://localhost:${1337}`);
                    });

                    const socket = new WebsocketServer(server)

                    socket.on('message', (data) => {
                        const {clientSocketKey: senderId, message} = data;
                        const clientSocketMap = socket.clientSocketMap
                        for (const clientId in clientSocketMap) {
                            if(clientId === senderId) {
                                continue;
                            }
                            socket.send(clientId,JSON.stringify( {clientId: clientId, message}));
                        }
                    })

                    socket.on('onConnected', ({socket: connectedSocket}) => {
                        connectedSocket.write(socket.prepareMessage(JSON.stringify({message: 'Welcome new member!'}), true))
                    })
                    const gracefulShutdown = () => {
                        console.log("\n👋 Server is shutting down...");
                        server.close(() => {
                            console.log("🛑 HTTP server closed.");
                        });
                        socket.close(() => {
                            console.log("🛑 WebSocket server closed.");
                            process.exit(0);
                        });
                    };

                    process.on('SIGINT', gracefulShutdown);
                    process.on('SIGTERM', gracefulShutdown);
                })

        }

    }