import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const engines = [
    { name: 'ChatGPT', domain: 'chatgpt.com' },
    { name: 'Perplexity', domain: 'perplexity.ai' },
    { name: 'Gemini', domain: 'gemini.google.com' },
    { name: 'Claude', domain: 'claude.ai' },
  ];

  for (const engine of engines) {
    await prisma.aIEngine.upsert({
      where: { name: engine.name },
      update: {},
      create: {
        name: engine.name,
        domain: engine.domain,
      },
    });
  }

  console.log('AI Engines seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
