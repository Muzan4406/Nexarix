import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/downline", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const level1 = await db.select().from(usersTable)
    .where(eq(usersTable.upline, user.username));

  const level2Users: any[] = [];
  for (const l1 of level1) {
    const children = await db.select().from(usersTable)
      .where(eq(usersTable.upline, l1.username));
    level2Users.push(...children);
  }

  const level3Users: any[] = [];
  for (const l2 of level2Users) {
    const children = await db.select().from(usersTable)
      .where(eq(usersTable.upline, l2.username));
    level3Users.push(...children);
  }

  const allDownlines = [...level1, ...level2Users, ...level3Users];
  const inactive = allDownlines.filter(u => u.status === "inactive");

  res.json({
    level1: level1.map(formatDownlineUser),
    level2: level2Users.map(formatDownlineUser),
    level3: level3Users.map(formatDownlineUser),
    inactive: inactive.map(formatDownlineUser),
  });
});

function formatDownlineUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    country: u.country,
    status: u.status,
    joinedAt: u.joinedAt?.toISOString(),
  };
}

export default router;
