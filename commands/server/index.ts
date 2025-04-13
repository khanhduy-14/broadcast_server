import ServerCommand from "./server.command";

export const serverCommandBuilder = (program) => {
    program.addCommand(ServerCommand.startServer)
}