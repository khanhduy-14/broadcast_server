import {program} from 'commander';
import {createCommandGateway} from "./commands";


program.version('1.0.0').description('Broadcast Channel CLI')


createCommandGateway(program);
program.parse(process.argv);