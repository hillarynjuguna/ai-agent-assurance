import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function testPostgres() {
  const db = new PGlite();
  const schema1 = readFileSync(join(process.cwd(), '..', '..', '..', 'docs', 'assurance-mvp-spec', 'db', '001_init_schema.sql'), 'utf-8');
  const schema2 = readFileSync(join(process.cwd(), 'db', '002_track_d_intake.sql'), 'utf-8');
  
  console.log('Applying 001_init_schema.sql...');
  await db.exec(schema1);
  console.log('001_init_schema.sql applied successfully!');
  
  console.log('Applying 002_track_d_intake.sql...');
  await db.exec(schema2);
  console.log('002_track_d_intake.sql applied successfully!');
  
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Public tables:', tables.rows.map((r: any) => r.table_name));
}

testPostgres().catch(console.error);
