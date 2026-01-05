import { sqlPool } from "../../db";

async function isUserAlreadySaved(userId: string): Promise<boolean> {
  const result = await sqlPool
    .request()
    .input("user_id", userId)
    .query(`
      SELECT 1 FROM users WHERE user_id = @user_id
    `);

  return result.recordset.length > 0;
}

export default isUserAlreadySaved;