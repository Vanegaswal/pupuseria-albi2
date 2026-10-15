import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

const isLocalhost = process.env.DATABASE_URL.includes("localhost");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalhost ? {} : { ssl: { rejectUnauthorized: false } })
});
