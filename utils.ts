class Utils {
   static isJsonString = (str: string) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    static concatBuffer(bufferList: Buffer[], totalLength: number) {
        const target = Buffer.allocUnsafe(totalLength);
        let offset = 0;

        for (const buffer of bufferList){
            target.set(buffer, offset);
            offset += buffer.length;

        }
        return target;
    }
}
export default Utils;