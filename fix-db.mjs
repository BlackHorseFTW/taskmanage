// Script to fix the database tables
import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

// Get the DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function main() {
  console.log('Connecting to database...');
  
  try {
    // Connect to the database
    const client = postgres(DATABASE_URL);
    
    console.log('Connected! Checking tasks table...');
    
    // First check if tasks table exists
    const tasksExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      );
    `;
    
    if (tasksExists[0].exists) {
      console.log('Tasks table exists, dropping it...');
      await client`DROP TABLE IF EXISTS tasks CASCADE;`;
      console.log('Tasks table dropped successfully.');
    }
    
    // Check if task_status enum exists
    const statusEnumExists = await client`
      SELECT EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'task_status'
      );
    `;
    
    if (!statusEnumExists[0].exists) {
      console.log('Creating task_status enum...');
      await client`CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed');`;
      console.log('task_status enum created.');
    }
    
    // Check if task_priority enum exists
    const priorityEnumExists = await client`
      SELECT EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'task_priority'
      );
    `;
    
    if (!priorityEnumExists[0].exists) {
      console.log('Creating task_priority enum...');
      await client`CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');`;
      console.log('task_priority enum created.');
    }
    
    // Create the tasks table with proper schema
    console.log('Creating new tasks table...');
    await client`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status task_status DEFAULT 'pending' NOT NULL,
        priority task_priority DEFAULT 'medium' NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        CONSTRAINT fk_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `;
    
    console.log('Tasks table created successfully!');
    
    // Close the connection
    await client.end();
    console.log('Database fix completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 