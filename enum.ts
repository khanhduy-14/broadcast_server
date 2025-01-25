const SocketEnum = {
        payloadLengthIndicator: {
            sevenBits : 125,
            sixteenBits: 126,
            sixtyFourBits: 127,
        },
        opCode: {
            text: 0x01,
        },
        marker: {
            mask: 0x80,
            notMask: 0x00
        },
        fin: {
            fullFragment: 0x80,
            separateFragment: 0x00,
        }
}


export {
    SocketEnum
}
