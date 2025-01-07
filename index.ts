import {createServer} from 'http';

const PORT = 1337

const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World!');
}).listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});


server.on('upgrade', (req, socket, head) => {
    console.log(`Upgrading ${req.url}`);
    console.log({
        head: req.headers,
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