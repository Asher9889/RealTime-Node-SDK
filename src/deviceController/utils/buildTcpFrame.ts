export default function buildTcpFrame(xml: string): Buffer {
  const xmlBuf = Buffer.from(xml, "utf8");

  const header = Buffer.alloc(12);

  // Magic bytes
  header.writeUInt8(0x55, 0); // 'U'
  header.writeUInt8(0x5A, 1); // 'Z'

  // Reserved
  header.writeUInt16LE(0x0000, 2);

  // ✅ PAYLOAD LENGTH (uint32)
  header.writeUInt32LE(xmlBuf.length, 4);

  // Sequence number
  header.writeUInt16LE(0x0001, 8);

  // Reserved / checksum
  header.writeUInt16LE(0x0000, 10);

  return Buffer.concat([header, xmlBuf]);
}
