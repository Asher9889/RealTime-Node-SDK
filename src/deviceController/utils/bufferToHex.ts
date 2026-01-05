function bufferToHex(buf: Buffer) {
  return buf.toString("hex").toUpperCase();
}

export default bufferToHex;