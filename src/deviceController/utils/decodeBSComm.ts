import { DecodedBSComm } from "./saveUserToMSSQL";

export default function decodeBSComm(buffer: Buffer): DecodedBSComm {
  let offset = 0;

  // 1️⃣ Read JSON length (includes null terminator)
  const jsonLen = buffer.readUInt32LE(offset);
  offset += 4;

  // 2️⃣ Read JSON bytes (exclude null terminator)
  const jsonBuf = buffer.slice(offset, offset + jsonLen - 1);
  const jsonText = jsonBuf.toString("utf8");
  const json = JSON.parse(jsonText);

  offset += jsonLen;

  // 3️⃣ Read binary blocks
  const bins: Buffer[] = [];
  while (offset + 4 <= buffer.length) {
    const binLen = buffer.readUInt32LE(offset);
    offset += 4;

    if (binLen <= 0 || offset + binLen > buffer.length) break;

    const bin = buffer.slice(offset, offset + binLen);
    bins.push(bin);

    offset += binLen;
  }

  return { json, bins };
}