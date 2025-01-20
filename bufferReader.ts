class BufferReader {
    private buffer: Buffer;

    constructor(initialBuffer: Buffer) {
        this.buffer = initialBuffer;
    }

    read(length: number): Buffer {
        if (length > this.buffer.length) {
            throw new Error('Not enough data in buffer');
        }

        // Read the specified number of bytes
        const result = this.buffer.subarray(0, length);

        // Remove the read bytes from the buffer
        this.buffer = this.buffer.subarray(length);

        return result;
    }

    get(): Buffer {
        return this.buffer;
    }
}

export default BufferReader