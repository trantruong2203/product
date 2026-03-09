import db, { aiEngines } from './db/index.js';

const defaultEngines = [
  { name: 'Google', domain: 'google.com' },
  { name: 'Bing', domain: 'bing.com' },
  { name: 'DuckDuckGo', domain: 'duckduckgo.com' },
  { name: 'Yahoo', domain: 'yahoo.com' },
  { name: 'Baidu', domain: 'baidu.com' },
];

async function seed() {
  console.log('Seeding AI engines...');
  
  for (const engine of defaultEngines) {
    const [created] = await db.insert(aiEngines).values({
      name: engine.name,
      domain: engine.domain,
      isActive: true,
    }).onConflictDoNothing().returning();
    
    if (created) {
      console.log(`Created engine: ${engine.name}`);
    } else {
      console.log(`Engine already exists: ${engine.name}`);
    }
  }
  
  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
