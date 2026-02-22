/**
 * Create or update the super admin user.
 * Run: npm run create:super-admin
 * Uses DATABASE_URL from .env
 */
import "dotenv/config";
import { db } from "../server/db";
import { roles, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDefaultPermissions } from "../shared/permissions";

const SUPER_ADMIN_USERNAME = "admin@primeclinic24.com";
const SUPER_ADMIN_PASSWORD = "PrimePos2233@@##";
const SUPER_ADMIN_FULL_NAME = "Super Admin";

function buildAdminPermissions() {
  const base = getDefaultPermissions();
  const all = { view: true, add: true, edit: true, delete: true };
  for (const k of Object.keys(base)) {
    base[k] = { ...all };
  }
  return base;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Create a .env file with DATABASE_URL.");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  // Find or create Admin role
  const existingRoles = await db.select().from(roles).where(eq(roles.name, "Admin"));
  let adminRoleId: number;
  if (existingRoles.length > 0) {
    adminRoleId = existingRoles[0].id;
    console.log("Using existing Admin role (id:", adminRoleId, ")");
  } else {
    const [inserted] = await db
      .insert(roles)
      .values({
        name: "Admin",
        description: "Full access",
        permissions: buildAdminPermissions(),
      })
      .returning();
    if (!inserted) {
      console.error("Failed to create Admin role");
      process.exit(1);
    }
    adminRoleId = inserted.id;
    console.log("Created Admin role (id:", adminRoleId, ")");
  }

  // Find existing user by username
  const existing = await db.select().from(users).where(eq(users.username, SUPER_ADMIN_USERNAME));

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        fullName: SUPER_ADMIN_FULL_NAME,
        email: SUPER_ADMIN_USERNAME,
        roleId: adminRoleId,
        isActive: true,
      })
      .where(eq(users.id, existing[0].id));
    console.log("Updated super admin user:", SUPER_ADMIN_USERNAME);
  } else {
    await db.insert(users).values({
      username: SUPER_ADMIN_USERNAME,
      password: hashedPassword,
      fullName: SUPER_ADMIN_FULL_NAME,
      email: SUPER_ADMIN_USERNAME,
      roleId: adminRoleId,
      isActive: true,
    });
    console.log("Created super admin user:", SUPER_ADMIN_USERNAME);
  }

  console.log("Done. Login with username:", SUPER_ADMIN_USERNAME);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
