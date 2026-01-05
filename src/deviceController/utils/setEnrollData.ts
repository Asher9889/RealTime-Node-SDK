// ===============================================
// 🎯 DEDICATED SET_ENROLL_DATA FUNCTION
// ===============================================

import { sqlPool } from "../../db";
import generateTransId from "./generateTransId";
import waitForCommandResult from "./waitForCommandResult";

/**
 * Sends a SET_ENROLL_DATA command with a specific backup number and binary data.
 * Adheres strictly to [Len4][JSON][00][Len4][Binary] BSComm format.
 * 
 * @param params.backupNumber - 12 for Face Template, 13 for Photo
 * @param params.binaryData - The raw Buffer (JPEG or Template Blob)
 */
export default async function setEnrollData(params: {
  deviceId: string;
  userId: string;
  backupNumber: number;
  binaryData: Buffer;
}) {
  const transId = generateTransId();
  console.log(`[setEnrollData] User: ${params.userId}, Backup: ${params.backupNumber}, Bytes: ${params.binaryData.length}`);

  // 1. JSON Payload
  // backup_number is the Critical Field for this command.
  const jsonPayload = JSON.stringify({
    user_id: params.userId,         // Context
    backup_number: params.backupNumber  // Target Index
  });

  // 2. Binary Encoding (Byte-Level Strictness)
  const bsCommPayload = buildBSCommStrict(jsonPayload, params.binaryData);

  // 3. Execution (Clear Old -> Insert Command -> Wait)
  await executeCommandRaw(transId, params.deviceId, 'SET_ENROLL_DATA', bsCommPayload);
  
  return { status: "ok", transId };
}


// ===============================================
// 🧩 BYTE-LEVEL ENCODER HELPER
// ===============================================

function buildBSCommStrict(jsonString: string, binaryData: Buffer): Buffer {
  const jsonBuf = Buffer.from(jsonString, 'utf-8');
  
  // A. JSON Length Header (4 Bytes, Little Endian)
  // Value = JSON Buffer Length + 1 (for Null Terminator)
  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length + 1);

  // B. Binary Length Header (4 Bytes, Little Endian)
  // Value = Key Binary Buffer Length
  const binLenHeader = Buffer.alloc(4);
  binLenHeader.writeUInt32LE(binaryData.length);

  // C. Construction
  // [Header] + [JSON Bytes] + [0x00] + [BinLength] + [Binary Bytes]
  return Buffer.concat([
    header,           // 4 bytes
    jsonBuf,          // N bytes
    Buffer.from([0x00]), // 1 byte (Null Terminator)
    binLenHeader,     // 4 bytes
    binaryData        // M bytes
  ]);
}

// ===============================================
// 🔌 RAW EXECUTION HELPER
// ===============================================
async function executeCommandRaw(transId: string, deviceId: string, cmdCode: string, payload: Buffer) {
  // 1. Clean previous state for this transId
  await sqlPool.request().input("t", transId).query(`
    DELETE FROM tbl_fkcmd_trans_cmd_result WHERE trans_id=@t;
    DELETE FROM tbl_fkcmd_trans_cmd_param WHERE trans_id=@t;
    DELETE FROM tbl_fkcmd_trans WHERE trans_id=@t;
  `);

  // 2. Insert Command Payload
  await sqlPool.request()
    .input("t", transId)
    .input("d", deviceId)
    .input("p", payload)
    .query(`INSERT INTO tbl_fkcmd_trans_cmd_param (trans_id, device_id, cmd_param) VALUES (@t, @d, @p)`);

  // 3. Insert Command Header
  await sqlPool.request()
    .input("t", transId)
    .input("d", deviceId)
    .input("c", cmdCode)
    .query(`INSERT INTO tbl_fkcmd_trans (trans_id, device_id, cmd_code, status, update_time) VALUES (@t, @d, @c, 'WAIT', GETDATE())`);

  // 4. Wait
  await waitForCommandResult(transId);
  
  // 5. Verify Result
  const res = await sqlPool.request().input("t", transId).query(`SELECT return_code FROM tbl_fkcmd_trans WHERE trans_id=@t`);
  if (!res.recordset.length || res.recordset[0].return_code !== 'OK') {
     throw new Error(`${cmdCode} Failed: ${res.recordset[0]?.return_code ?? 'NO_REPLY'}`);
  }
}