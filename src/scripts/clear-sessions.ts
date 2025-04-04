/**
 * Script to clear all sessions in the database
 * Run with: pnpm tsx src/scripts/clear-sessions.ts
 */

import { db } from '../server/db';
import { sessions } from '../server/db/schema';
import { sql } from 'drizzle-orm';

async function clearSessions() {
  console.log('Starting session cleanup...');
  
  try {
    // Delete all sessions from the database
    const result = await db.delete(sessions).where(sql`1=1`);
    
    // Get the count of deleted rows
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions);
    
    const count = countResult[0]?.count ?? 0;
    
    console.log(`Successfully cleared all sessions. Deleted ${count} sessions.`);
  } catch (error) {
    console.error('Error clearing sessions:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
void clearSessions(); 