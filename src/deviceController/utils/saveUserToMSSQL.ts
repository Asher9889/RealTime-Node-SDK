import { sqlPool } from "../../db";

export type DecodedBSComm = {
  json: any;
  bins: Buffer[];
};

export default async function saveUserToMSSQL(decoded: DecodedBSComm) {
  const user = decoded.json;

  const photoIndex = parseInt(user.user_photo.replace("BIN_", "")) - 1;
  const photo = decoded.bins[photoIndex];

  const face = user.enroll_data_array[0];
  const faceIndex = parseInt(face.enroll_data.replace("BIN_", "")) - 1;
  const faceTemplate = decoded.bins[faceIndex];

  const req = sqlPool.request();

  // user table
  await req
    .input("user_id", user.user_id)
    .input("user_name", user.user_name)
    .input("privilege", user.user_privilege)
    .input("enabled", user.user_enabled)
    .input("depart_id", user.user_depart_id)
    .query(`
      MERGE users AS t
      USING (SELECT @user_id AS user_id) AS s
      ON t.user_id = s.user_id
      WHEN MATCHED THEN UPDATE SET
        user_name = @user_name,
        privilege = @privilege,
        enabled = @enabled,
        depart_id = @depart_id,
        updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (user_id, user_name, privilege, enabled, depart_id, updated_at)
        VALUES (@user_id, @user_name, @privilege, @enabled, @depart_id, GETDATE());
    `);

  // photo
  await req
    .input("user_id", user.user_id)
    .input("photo", photo)
    .query(`
      MERGE user_photos AS t
      USING (SELECT @user_id AS user_id) AS s
      ON t.user_id = s.user_id
      WHEN MATCHED THEN UPDATE SET photo = @photo
      WHEN NOT MATCHED THEN
        INSERT (user_id, photo) VALUES (@user_id, @photo);
    `);

  // face template
  await req
    .input("user_id", user.user_id)
    .input("backup_number", face.backup_number)
    .input("face_template", faceTemplate)
    .query(`
      MERGE user_face_templates AS t
      USING (
        SELECT @user_id AS user_id, @backup_number AS backup_number
      ) AS s
      ON t.user_id = s.user_id AND t.backup_number = s.backup_number
      WHEN MATCHED THEN UPDATE SET face_template = @face_template
      WHEN NOT MATCHED THEN
        INSERT (user_id, backup_number, face_template)
        VALUES (@user_id, @backup_number, @face_template);
    `);
}
