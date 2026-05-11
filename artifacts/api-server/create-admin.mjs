import bcrypt from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const passwordHash = await bcrypt.hash("admin123", 10);

    await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (
        'Admin',
        'admin@designyourindia.com',
        '${passwordHash}',
        'admin'
      )
      ON CONFLICT (email)
      DO UPDATE SET password_hash='${passwordHash}';
    `);

    console.log("✅ Admin created/updated");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();