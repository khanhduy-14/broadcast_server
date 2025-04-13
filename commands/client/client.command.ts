import { Command } from "commander";
import WebSocketClient from "../../websocket-client";
import * as readline from "node:readline"

export default class ClientCommand {
    static get connect() {
        return new Command("connect")
            .description("Connect to the server")
            .action(async () => {
                const client = new WebSocketClient();
                let rl: readline.Interface;

                function printMessage(message: string, isYou: boolean = true, noReadLine: boolean = false) {
                    if (rl) {
                        if(isYou) {
                            readline.moveCursor(process.stdout, 0, -1);
                        }
                        readline.clearLine(process.stdout, 0)
                        readline.cursorTo(process.stdout, 0);
                    }
                    console.log(message);
                    if(noReadLine) {
                        return;
                    }
                    if (rl) rl.prompt();
                }

                function  closeConnect() {
                    printMessage("👋 Exiting...", false, true);
                    console.log('Connect is closed')
                    client.close();
                    process.exit(0);
                }

                try {
                    await client.connect("localhost", 1337, "/");
                    printMessage("✅ Connected to server!");
                } catch (err) {
                    printMessage("WebSocket connection error: " + err);
                    process.exit(1);
                }

                rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    prompt: "💬 Type your message (or type exit for close): ",
                });

                client.on("message", (data) => {
                    if (!data || !data?.message) return;

                    if (!data?.clientId) {
                        printMessage(`Server: ${data.message}`, false);
                    } else {
                        printMessage(`User [${data.clientId}]: ${data.message}`, false);
                    }
                });

                client.on("close", () => {
                    closeConnect()
                });
                rl.prompt();

                rl.on("line", (line) => {
                    const message = line.trim();

                    if (message.toLowerCase() === "exit") {
                        closeConnect()
                    }
                    printMessage(`You: ${message}`);
                    client.sendMessage(JSON.stringify(message));
                    rl.prompt();
                });

                rl.on("close", () => {
                    closeConnect()
                });
            });
    }
}
