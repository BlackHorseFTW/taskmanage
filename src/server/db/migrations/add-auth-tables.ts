import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Check if DATABASE_URL is defined
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in your environment variables");
  process.exit(1);
}

// This script will run migrations to add auth tables to your database
async function main() {
  console.log("Running migrations...");
  console.log("Using database URL:", DATABASE_URL.replace(/:[^:]*@/, ":****@")); // Log URL with hidden password
  
  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  
  await migrate(db, { migrationsFolder: "drizzle" });
  
  console.log("Migrations complete!");
  await sql.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:");
  console.error(e);
  process.exit(1);
}); 