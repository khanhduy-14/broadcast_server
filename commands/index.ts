import {clientCommandBuilder} from "./client";
import {serverCommandBuilder} from "./server";

export const createCommandGateway = (program) => {
    clientCommandBuilder(program);
    serverCommandBuilder(program);
}