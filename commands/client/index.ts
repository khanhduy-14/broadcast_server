import ClientCommand from "./client.command";

export const clientCommandBuilder = (program) => {
    program.addCommand(ClientCommand.connect)
}