import { sqlPool } from "../db";  
import queueGetUserIdList from "./utils/queueGetUserIdList";
import queueGetUserInfo from "./utils/queueGetUserInfo";
import readUserIdList from "./utils/readUserIdList";
import readUserInfo from "./utils/readUserInfo";
import waitForCommandResult from "./utils/waitForCommandResult";


export async function syncAllUsersService() {
    console.log("\n========================================");
    console.log("[syncAllUsersService] Starting sync process");
    console.log("========================================\n");
    
    try {
        const deviceId = "RSS20240372974";
        console.log(`[syncAllUsersService] Target deviceId: ${deviceId}`);
    
        // Step 1: Get user ID list
        console.log("\n--- STEP 1: Getting User ID List ---");
        const listTransId = await queueGetUserIdList(deviceId);
        await waitForCommandResult(listTransId);
        const users = await readUserIdList(listTransId);
        console.log(`[syncAllUsersService] Total users to sync: ${users.length}`);
    
        // Step 2: Loop through users
        console.log("\n--- STEP 2: Fetching Individual User Info ---");
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`\n[syncAllUsersService] Processing user ${i + 1}/${users.length}: ${user.user_id}`);
            
            try {
                const infoTransId = await queueGetUserInfo(deviceId, user.user_id);
                await waitForCommandResult(infoTransId);
        
                const raw = await readUserInfo(infoTransId);

                
        
                console.log(`[syncAllUsersService] Successfully retrieved data for user: ${user.user_id}`);
                console.log(`[syncAllUsersService] Raw data buffer size: ${raw?.length || 0} bytes`);
                successCount++;
        
            } catch (error) {
                console.error(`[syncAllUsersService] Error processing user ${user.user_id}:`, error);
                failCount++;
            }
        }

        console.log("\n========================================");
        console.log("[syncAllUsersService] Sync Summary:");
        console.log(`  Total Users: ${users.length}`);
        console.log(`  Success: ${successCount}`);
        console.log(`  Failed: ${failCount}`);
        console.log("========================================\n");
    
        return {
            status: "completed",
            totalUsers: users.length,
            successCount,
            failCount
        };
    } catch (error) {
        console.error("\n[syncAllUsersService] FATAL ERROR:", error);
        throw error;
    }
}