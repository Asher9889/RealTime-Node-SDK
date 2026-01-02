# Comprehensive Analysis & Extraction Strategy
- I have completed the deep-dive analysis of the FK SDK source code. Here are the definitive answers and a production-grade strategy to extract all user data.

# 🔍 PART 1 — SDK FLOW VERIFICATION
1. How the SDK Sends/Receives Data
- Sending: The SDK does not have a single "Download All" command. It operates on a "List then Fetch" basis.
- Parsing: The SDK uses a monolithic GetBinDataFromBSCommBinData method to parse responses.
- BIN_x References: These are 1-based indexes into the binary blocks found within the BSComm buffer.
- Block 0 is always the JSON String (which contains the references like "user_photo": "BIN_1").
- Block 1 is the first binary chunk after the JSON.
- Block 2 is the second, and so on.
2. Is there a GET_ALL_USER_INFO?
- No. There is no command in the codebase named GET_ALL_USER_INFO.

- Discovery: You must use GET_USER_ID_LIST first. This command returns a binary list of all User IDs and their enrolled backup numbers.
- Extraction: You must then loop through these IDs and call GET_USER_INFO (or GET_ENROLL_DATA) for each one.
3. GET_USER_INFO vs GET_ENROLL_DATA
- GET_ENROLL_DATA: Typically retrieves specific biometric templates (Face, FP, etc.) based on backup_number.
- GET_USER_INFO: This is the Superior Command for your goal.
- It retrieves the User Metadata (Name, Privilege).
It retrieves the User Photo (user_photo -> BIN_x).
It retrieves All Biometrics (enroll_data_array -> BIN_y).
Recommendation: Use GET_USER_INFO with {"user_id": "..."} to get everything in one transaction.
# 🔍 PART 2 — DATABASE FLOW ANALYSIS
1. The Lifecycle
- Request: You insert a row into tbl_fkcmd_trans (Status 'WAIT') and tbl_fkcmd_trans_cmd_param.
- Pickup: Device polls, reads the command, and executes it.
- Result: Device writes the result to tbl_fkcmd_trans_cmd_result.
- Column: cmd_result (Types: varbinary(max)).
The SDK then reads this blob and parses it on the web server side.
2. Does it use tbl_realtime_enroll_data?
- NO. GET_ENROLL_DATA / GET_USER_INFO responses go purely into the cmd_result transaction table.

tbl_realtime_enroll_data is strictly for when a user enrolls on the device screen manually and the device "pushes" that event to the server.
# 🔍 PART 3 — BINARY DECODING STRATEGY
- The BSComm buffer format is consistent. Here is the exact parsing logic to decode any response from the device.

- Structure: [TotalLen (4)] [JsonLen (4)] [JSON Bytes] [0x00] [Bin1Len (4)] [Bin1Bytes] [Bin2Len (4)] [Bin2Bytes] ...
- Parsing Algorithm (Pseudo-code):
- Read first 4 bytes as Int32 (Little Endian) -> LenJsonString.
- Note: This length includes the null terminator.
- Read LenJsonString bytes.
- Convert bytes 0 to LenJsonString - 2 to UTF-8 String -> This is your Metadata JSON.
- Set CurrentOffset = 4 + LenJsonString.
- Initialize BinBlockIndex = 1.
- Loop:
- Read 4 bytes at CurrentOffset -> LenBinData.
- Read LenBinData bytes -> This is your Binary Block #BinBlockIndex.
- If JSON says "user_photo": "BIN_1", this block is the JPEG.
- If JSON says "enroll_data": "BIN_2", this block is the Face Template.
- CurrentOffset += 4 + LenBinData.
- BinBlockIndex++.
# 🔍 PART 4 — DEVICE MEMORY REALITY CHECK
- 1. Is data retrievable without punches?
- YES. User data is stored in the device's persistent flash memory (User Database). The GET_USER_INFO command connects to this database directly. It does not rely on attendance logs or punch history.

- 2. Conditions for Success
- The device must be online (connected=1).
- The requesting trans_id must be unique.
- The SQL command parameters must be correctly formed (BSComm header).
# 🔍 PART 5 — CORRECT SOLUTION DESIGN
- The "Sidecar" Sync Approach
- Since you cannot change the firmware, the cleanest approach is an external Service (Node.js/Python) that talks to the SQL DB alongside the official SDK.

Step-by-Step Implementation Plan:

- Stop/Pause Sync: Ensure no conflicting operations (optional but safer).
- Discover Users:
- Insert command GET_USER_ID_LIST (Param: null).
- Wait for RESULT in tbl_fkcmd_trans.
- Parsing the result allows you to build a list of all user_ids in the device.
- Note: The official SDK automatically parses this into tbl_fkcmd_trans_cmd_result_user_id_list if you let it run, or you can parse the binary result yourself.
- Batch Extract:
- For each user_id found:
- Insert command GET_USER_INFO (Param: BSComm({"user_id":"..."})).
- Wait for RESULT.
- Read tbl_fkcmd_trans_cmd_result.
- Decode using the strategy in Part 3.
- Save:
- Save Photo (BIN_x matching user_photo key) as .jpg.
- Save Face Data (BIN_y matching enroll_data key) to your AI DB.
- Update your external User DB with name/privilege.
- Pro-Tip: You can run these commands in parallel batches (e.g., 5-10 users at a time) by generating unique trans_ids for each.

This approach gives you a complete, pixel-perfect copy of the device's user database without relying on realtime events.