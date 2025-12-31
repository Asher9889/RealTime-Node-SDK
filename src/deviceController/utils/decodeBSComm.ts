export type DecodedBSComm = {
  json: any;
  bins: Buffer[];
};

export default function decodeBSComm(buffer: Buffer): DecodedBSComm {
  let offset = 0;

  // 1️⃣ Read reported JSON length (UNTRUSTED)
  const reportedJsonLen = buffer.readUInt32LE(offset);
  offset += 4;

  // 2️⃣ Extract a SAFE window for JSON scanning
  const scanEnd = Math.min(
    buffer.length,
    offset + reportedJsonLen + 32 // allow garbage bytes
  );

  const jsonWindow = buffer.slice(offset, scanEnd).toString("utf8");

  // 3️⃣ Find LAST closing brace
  const lastBrace = jsonWindow.lastIndexOf("}");
  if (lastBrace === -1) {
    throw new Error("Invalid BSComm: JSON closing brace not found");
  }

  const jsonText = jsonWindow.slice(0, lastBrace + 1);

  let json;
  try {
    json = JSON.parse(jsonText);
  } catch (err) {
    console.error("❌ JSON parse failed");
    console.error("JSON TEXT:", jsonText);
    console.error("Reported JSON length:", reportedJsonLen);
    throw err;
  }

  // 4️⃣ Advance offset to AFTER JSON (binary starts here)
  offset += Buffer.byteLength(jsonText, "utf8");

  // Skip any trailing null / garbage bytes
  while (
    offset < buffer.length &&
    (buffer[offset] === 0x00 || buffer[offset] === 0xff)
  ) {
    offset++;
  }

  // 5️⃣ Read binary blocks
  const bins: Buffer[] = [];

  while (offset + 4 <= buffer.length) {
    const binLen = buffer.readUInt32LE(offset);
    offset += 4;

    if (binLen <= 0 || offset + binLen > buffer.length) break;

    bins.push(buffer.slice(offset, offset + binLen));
    offset += binLen;
  }

  return { json, bins };
}
