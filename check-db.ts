// Script to check database tables
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Load environment variables
dotenv.config();

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  return url;
}

async function main() {
  console.log('Connecting to database...');
  
  try {
    // Get the database URL and ensure it's a string
    const dbUrl = getDatabaseUrl();
    
    // Connect to the database
    const client = postgres(dbUrl);
    const db = drizzle(client);
    
    console.log('Connected! Checking tables...');
    
    // List all tables in the public schema
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\nTables in database:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check each table structure
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\nStructure of "${tableName}" table:`);
      
      const columns = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;
      
      columns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }
    
    // Close the connection
    await client.end();
    console.log('\nCheck completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 