export default function encodeEnrollUserPhotoBSComm(params: {
  user_id: string;
  user_name: string;
  user_privilege?: string;
  photo: Buffer; // JPEG bytes
}) {
  const json = {
    user_id: params.user_id,
    user_name: params.user_name,
    user_privilege: params.user_privilege ?? "User",
    user_photo: "BIN_1",
    enroll_data_array: [],
    backup_number: 12 
  };

  const jsonBuf = Buffer.from(JSON.stringify(json), "utf8");

  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length + 1); // + null terminator

  const nullByte = Buffer.from([0x00]);

  const binLen = Buffer.alloc(4);
  binLen.writeUInt32LE(params.photo.length);

  return Buffer.concat([
    header,
    jsonBuf,
    nullByte,
    binLen,
    params.photo
  ]);
}


// export default function encodeEnrollUserPhotoBSComm(params: {
//   user_id: string;
//   user_name: string;
//   user_privilege?: string;
//   photo: Buffer; // JPEG bytes
// }) {
//   // ✅ MINIMAL JSON (this is CRITICAL)
//   const json = {
//     user_id: params.user_id,
//     user_name: params.user_name,
//     user_privilege: params.user_privilege ?? "User",
//     user_enabled: 1,
//     user_depart_id: 0
//   };

//   const jsonBuf = Buffer.from(JSON.stringify(json), "utf8");

//   // ✅ JSON length ONLY (no +1, no null)
//   const jsonLen = Buffer.alloc(4);
//   jsonLen.writeUInt32LE(jsonBuf.length);

//   // ✅ Photo length
//   const photoLen = Buffer.alloc(4);
//   photoLen.writeUInt32LE(params.photo.length);

//   // ✅ Final payload
//   return Buffer.concat([
//     jsonLen,
//     jsonBuf,
//     photoLen,
//     params.photo
//   ]);
// }




export function encodeUserInfoWithPhoto(params: { user_id: string, user_name: string, photo: Buffer }) {
  const json = JSON.stringify({
    user_id: params.user_id,
    user_name: params.user_name,
    user_privilege: "User", // Required field
    user_photo: "BIN_1",    // Magic Reference
    enroll_data_array: []
  });
  const jsonBuf = Buffer.from(json, 'utf-8');
  
  const header = Buffer.alloc(4);
  header.writeUInt32LE(jsonBuf.length + 1);
  const binLen = Buffer.alloc(4);
  binLen.writeUInt32LE(params.photo.length);
  return Buffer.concat([
    header, 
    jsonBuf, 
    Buffer.from([0x00]), 
    binLen, 
    params.photo
  ]);
}