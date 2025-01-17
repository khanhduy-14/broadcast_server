class DataFrameReader {
    private dataFrame: Buffer[];

    constructor(dataFrame: Buffer[] = []) {
        this.dataFrame = dataFrame;
    }

    public add(chunk: Buffer): void {
        this.dataFrame.push(chunk);
    }
    public get(start: number = 0, end: number = this.dataFrame.length): Buffer[] {
        return this.dataFrame.slice(start,end)
    }
    public getBuffer(start: number = 0, end: number = this.dataFrame.length): { buffer: Buffer; length: number } {
        const completeBuffer = Buffer.concat(this.dataFrame.slice(start, end));
        return { buffer: completeBuffer, length: this.dataFrame.length };
    }

    public remove(n: number): void {
        this.dataFrame.splice(0, n);
    }
}
export default  DataFrameReader