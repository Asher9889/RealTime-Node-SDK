export default function buildSetEnrollDataPayload(backupNumber: string, binaryData: Buffer) {
  // 1. JSON Part
  // backup_number MUST be an integer in JSON
  const json = JSON.stringify({
    backup_number: backupNumber
    // NO "enroll_data" here! It's just a loose reference in logic, 
    // the actual data is the appended binary block.
  });
  
  const jsonBuf = Buffer.from(json, 'utf-8');
  
  // 2. Header
  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length + 1); // +1 for null
  
  // 3. Binary Header
  const binHeader = Buffer.alloc(4);
  binHeader.writeUInt32LE(binaryData.length);
  
  // 4. Concat All
  return Buffer.concat([
    header,
    jsonBuf,
    Buffer.from([0x00]), // Null
    binHeader,
    binaryData
  ]);
}