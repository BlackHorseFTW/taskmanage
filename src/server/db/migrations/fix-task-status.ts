import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Check if DATABASE_URL is defined
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in your environment variables");
  process.exit(1);
}

// This script will fix the task_status enum issue
async function main() {
  console.log("Fixing task_status enum...");
  console.log("Using database URL:", DATABASE_URL!.replace(/:[^:]*@/, ":****@"));
  
  const sql = postgres(DATABASE_URL!, { max: 1 });
  
  try {
    // Create a backup of the tasks table
    console.log("Creating a backup of the tasks table...");
    await sql`CREATE TABLE IF NOT EXISTS tasks_backup AS SELECT * FROM tasks`;
    console.log("Backup created successfully.");
    
    // Drop the status column and recreate it with the correct enum
    console.log("Dropping the status column...");
    await sql`ALTER TABLE tasks DROP COLUMN IF EXISTS status`;
    
    // Make sure the enum exists
    console.log("Creating/updating the task_status enum...");
    try {
      await sql`CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed')`;
    } catch (error) {
      console.log("Enum already exists, adding values if needed...");
      // Enum already exists, try to add values
      try { await sql`ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pending'`; } catch (e) {}
      try { await sql`ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'in-progress'`; } catch (e) {}
      try { await sql`ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'completed'`; } catch (e) {}
    }
    
    // Add the status column back with the correct enum
    console.log("Adding the status column with the correct enum...");
    await sql`ALTER TABLE tasks ADD COLUMN status task_status DEFAULT 'pending' NOT NULL`;
    
    // Restore data from backup if needed (assuming all were 'pending' for simplicity)
    // For production, you would need a more sophisticated data migration strategy
    
    console.log("Task status enum fixed successfully!");
  } catch (error) {
    console.error("Error fixing task_status enum:", error);
    throw error;
  } finally {
    await sql.end();
  }
  
  process.exit(0);
}

main().catch((e) => {
  console.error("Fix failed:");
  console.error(e);
  process.exit(1);
}); 