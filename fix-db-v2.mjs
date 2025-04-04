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

console.log('Using DATABASE_URL:', DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Mask password

async function main() {
  console.log('Connecting to database...');
  
  try {
    // Connect to the database
    const client = postgres(DATABASE_URL);
    
    console.log('Connected! Running diagnostics...');
    
    // Check database connection and version
    const version = await client`SELECT version();`;
    console.log('Database version:', version[0].version);
    
    // List all tables
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\nExisting tables:');
    if (tables.length === 0) {
      console.log('No tables found in public schema.');
    } else {
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }
    
    // List all enums
    const enums = await client`
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e'
      ORDER BY typname;
    `;
    
    console.log('\nExisting enums:');
    if (enums.length === 0) {
      console.log('No enums found.');
    } else {
      enums.forEach(enum_type => {
        console.log(`- ${enum_type.typname}`);
      });
    }
    
    // Drop tasks table if it exists
    console.log('\nDropping tasks table if it exists...');
    await client`DROP TABLE IF EXISTS tasks CASCADE;`;
    console.log('Done.');
    
    // Ensure enums exist
    console.log('\nCreating/ensuring enums exist...');
    
    // For task_status
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
          CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed');
        END IF;
      END
      $$;
    `;
    
    // For task_priority
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
          CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
        END IF;
      END
      $$;
    `;
    
    // For user_role (if not exists)
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin');
        END IF;
      END
      $$;
    `;
    
    console.log('Enums created/verified.');
    
    // Create the tasks table
    console.log('\nCreating new tasks table...');
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
    
    // Verify the tasks table
    const tasksColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nTasks table structure:');
    tasksColumns.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Check foreign key constraints
    const foreignKeys = await client`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'tasks';
    `;
    
    console.log('\nForeign key constraints for tasks:');
    if (foreignKeys.length === 0) {
      console.log('No foreign key constraints found.');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`- ${fk.column_name} references ${fk.foreign_table_name}(${fk.foreign_column_name})`);
      });
    }
    
    // Close the connection
    await client.end();
    console.log('\nDatabase fix completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 