import {SocketEnum} from "./enum";
import {BYTE_CONSTANT, SOCKET_CONSTANT} from "./constant";
import Utils from "./utils";
import {EventEmitter} from "node:events";
import * as crypto from "node:crypto";
import DataFrame from "./dataFrame";
import BufferReader from "./bufferReader";

class WebSocketBase extends EventEmitter {

    constructor () {
        super()
        this.prepareMessage = this.prepareMessage.bind(this)
    }

    prepareMessage (message: any, applyMask: boolean = false) {
        let msg = Buffer.from(message);
        const messageSize =  msg.length;
        let dataFrameBuffer: Buffer;

        const firstByte = 0x80 | SocketEnum.opCode.text;
        const marker = applyMask ? SocketEnum.marker.mask : SocketEnum.marker.notMask;
        if(messageSize <= SocketEnum.payloadLengthIndicator.sevenBits) {
            dataFrameBuffer = Buffer.from([firstByte].concat(messageSize | marker))
        }
        else if (messageSize <= BYTE_CONSTANT.MAXIMUM_SIXTEEN_BITS_VALUE) {
            const offsetFourBytes = 4
            const target = Buffer.allocUnsafe(offsetFourBytes)
            target[0] = firstByte
            target[1] = SocketEnum.payloadLengthIndicator.sixteenBits | marker

            target.writeUint16BE(messageSize, 2)

            dataFrameBuffer = target

        } else if (messageSize <= BYTE_CONSTANT.MAXIMUM_SIXTY_FOUR_BITS_VALUE) {
            const offsetTenBytes = 10
            const target = Buffer.allocUnsafe(offsetTenBytes);
            target[0] = firstByte
            target[1] = SocketEnum.payloadLengthIndicator.sixtyFourBits | marker;
            target.writeBigUInt64BE(BigInt(messageSize), 2)
            dataFrameBuffer = target;
        }
        else {
            throw new Error(`Can't sending your message too long`);
        }
        if (applyMask) {
            const maskKey = crypto.randomBytes(SOCKET_CONSTANT.MASK_KEY.BYTES);
            dataFrameBuffer = Buffer.concat([dataFrameBuffer, maskKey]);
            msg = this.toggleMask(msg, maskKey);

        }
        console.log('send payload', messageSize)
        const totalLength = dataFrameBuffer.byteLength + messageSize;
        return Utils.concatBuffer([dataFrameBuffer, msg], totalLength);
    }

     extractMessage(dataFrameReader: DataFrame) {
        const {buffer, length: chunkLength} = dataFrameReader.getBuffer();
        const bufferReader = new BufferReader(buffer);
        bufferReader.read(1)
        const markerAndPayloadLength = bufferReader.read(1).readUInt8(0);
        const isApplyMask = markerAndPayloadLength >> 7;
        const lengthIndicatorInBits = markerAndPayloadLength - (isApplyMask ? BYTE_CONSTANT.FIRST_BIT_VALUE : 0);

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

        const maskKey = isApplyMask ? bufferReader.read(4) : Buffer.allocUnsafe(0);

        if(messageLength > bufferReader.get().length) {
            console.debug('Need more chunk data frame fragment');
            return;
        }
        if(dataFrameReader.get().length > 1) {
            console.debug('Data frame chunk assembled');
            console.debug('Data frame chunk assembled');
        }
        let rawMessage = bufferReader.read(messageLength);
        const received = (maskKey.length > 0 ?  this.toggleMask(rawMessage, maskKey) : rawMessage).toString('utf-8');

        const data = Utils.isJsonString(received) ? JSON.parse(received) : received;
        dataFrameReader.remove(chunkLength)
        return data;

    }

     toggleMask (dataBuffer: Buffer, maskKey: Buffer) {
         const maskedMessageBuffer = Buffer.alloc(dataBuffer.length);

         for (let i = 0; i < dataBuffer.length; i++) {
             maskedMessageBuffer[i] = dataBuffer[i] ^ maskKey[i % 4];
         }

         return maskedMessageBuffer;
    }


}

export default WebSocketBase;