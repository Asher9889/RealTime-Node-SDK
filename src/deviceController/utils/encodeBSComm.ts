export default function encodeBSComm(json: object): Buffer {
    console.log(`[encodeBSComm] Encoding JSON:`, json);
    const text = Buffer.from(JSON.stringify(json), "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32LE(text.length + 1, 0); // + null
    const encoded = Buffer.concat([len, text, Buffer.from([0x00])]);
    console.log(`[encodeBSComm] Encoded buffer length: ${encoded.length} bytes`);
    return encoded;
}