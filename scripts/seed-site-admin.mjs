import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const tenantSlug = process.env.ACTIVE_TENANT_SLUG || "sicp-senior-research";
const tenantName = "SICP Senior Research Lab";

const accounts = [
  {
    email: "thinkinthegrey@gmail.com",
    displayName: "황성훈",
    role: Role.MEMBER
  },
  {
    email: "loveyer@iscu.ac.kr",
    displayName: "김환",
    role: Role.MEMBER
  },
  {
    email: "mow.coding@gmail.com",
    displayName: "관리자",
    role: Role.ADMIN
  },
  {
    email: "sicpseoul@gmail.com",
    displayName: "관리자",
    role: Role.ADMIN
  }
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    create: {
      name: tenantName,
      slug: tenantSlug
    },
    update: {
      name: tenantName
    }
  });

  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        name: account.displayName
      },
      update: {
        name: account.displayName
      }
    });

    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id
        }
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: account.role
      },
      update: {
        role: account.role
      }
    });

    await prisma.authorProfile.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id
        }
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        displayName: account.displayName
      },
      // Keep user-edited display names intact when the seed is run again.
      update: {}
    });
  }

  console.log(`Seeded ${accounts.length} site admin accounts for tenant ${tenantSlug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
