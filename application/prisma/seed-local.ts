import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed local data");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const customer = await db.user.upsert({
    where: { email: "customer.local@teleport.test" },
    update: { name: "Maya Customer", role: "USER", vehicleClass: null },
    create: { email: "customer.local@teleport.test", name: "Maya Customer", role: "USER" },
  });

  await db.user.upsert({
    where: { email: "driver.local@teleport.test" },
    update: { name: "Aarav Driver", role: "DRIVER", vehicleClass: "BIKE" },
    create: { email: "driver.local@teleport.test", name: "Aarav Driver", role: "DRIVER", vehicleClass: "BIKE" },
  });

  if (await db.address.count({ where: { userId: customer.id } }) === 0) {
    await db.address.createMany({
      data: [
        { userId: customer.id, nickname: "Home", address: "100 Feet Road, Indiranagar, Bengaluru", contactName: "Maya Customer", mobile: "9999999001", latitude: 12.9784, longitude: 77.6408 },
        { userId: customer.id, nickname: "Office", address: "Koramangala 5th Block, Bengaluru", contactName: "Maya Customer", mobile: "9999999001", latitude: 12.9352, longitude: 77.6245 },
      ],
    });
  }
} finally {
  await db.$disconnect();
}
