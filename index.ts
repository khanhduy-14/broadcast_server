import {createServer} from 'http';
import WebsocketServer from "./websocket-server";

const PORT = 1337




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
    socket.send(clientSocketKey, JSON.stringify(message));
})

    ;[
    "uncaughtException",
    "unhandledRejection"
].forEach(event =>
    process.on(event, (err) => {
        console.error(`Error: ${event}, Message: ${err.stack || err}`)
    })
)


