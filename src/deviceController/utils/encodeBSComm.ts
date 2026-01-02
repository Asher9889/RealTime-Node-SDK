export default function encodeBSComm(json: object, bins: Buffer[] = []): Buffer {
  const jsonText = Buffer.from(JSON.stringify(json), "utf8");
  const jsonLen = Buffer.alloc(4);
  jsonLen.writeUInt32LE(jsonText.length + 1, 0); // + null

  const parts: Buffer[] = [
    jsonLen,
    jsonText,
    Buffer.from([0x00])
  ];

  for (const bin of bins) {
    const binLen = Buffer.alloc(4);
    binLen.writeUInt32LE(bin.length, 0);
    parts.push(binLen, bin);
  }

  return Buffer.concat(parts);
}
