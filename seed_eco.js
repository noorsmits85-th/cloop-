const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const metrics = [
    { keyword: "jean", waterFactor: 7000, co2Factor: 33, greenPts: 200 },
    { keyword: "denim", waterFactor: 7000, co2Factor: 33, greenPts: 200 },
    { keyword: "quần", waterFactor: 5000, co2Factor: 25, greenPts: 150 },
    { keyword: "áo thun", waterFactor: 2700, co2Factor: 15, greenPts: 100 },
    { keyword: "t-shirt", waterFactor: 2700, co2Factor: 15, greenPts: 100 },
    { keyword: "váy", waterFactor: 800, co2Factor: 20, greenPts: 150 },
    { keyword: "đầm", waterFactor: 800, co2Factor: 20, greenPts: 150 },
    { keyword: "lụa", waterFactor: 800, co2Factor: 20, greenPts: 150 },
    { keyword: "áo khoác", waterFactor: 3000, co2Factor: 45, greenPts: 250 },
    { keyword: "jacket", waterFactor: 3000, co2Factor: 45, greenPts: 250 },
    { keyword: "da", waterFactor: 3000, co2Factor: 45, greenPts: 250 },
    { keyword: "others", waterFactor: 2000, co2Factor: 15, greenPts: 100 }
  ];

  for (const m of metrics) {
    await prisma.ecoMetric.upsert({
      where: { keyword: m.keyword },
      update: m,
      create: m
    });
  }
  console.log("EcoMetrics seeded successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
