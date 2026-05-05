import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "club_admin"; // only stored role; super_admin is virtual-only via SITE_PASSWORD
  status: "active" | "pending";
  clubSlugs: string[];
  recipientName?: string;  // links this account to a split recipient (e.g. "Tina")
  email?: string;
  preferredCurrency?: string; // ISO 4217 lowercase (e.g. "eur", "usd"); used for payout display
  inviteToken?: string;
  inviteExpiry?: string; // ISO timestamp
  bankDetails?: BankDetails;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

const TMP_FILE = "/tmp/users.json";
const SEED_FILE = path.join(process.cwd(), "data", "users.json");

function readStore(): User[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as User[];
      }
    } catch {
      // try next
    }
  }
  return [];
}

function writeStore(users: User[]): void {
  const json = JSON.stringify(users, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + ":bs-accounting").digest("hex");
}

export function getAllUsers(): SafeUser[] {
  return readStore().map(({ passwordHash: _ph, ...rest }) => rest);
}

export function getUserById(id: string): User | undefined {
  return readStore().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return readStore().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function verifyUserPassword(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  if (!user) return null;
  if (user.passwordHash !== hashPassword(password)) return null;
  return user;
}

export function createUser(data: {
  username: string;
  password: string;
  clubSlugs: string[];
  status?: "active" | "pending";
}): SafeUser {
  const users = readStore();
  if (users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new Error(`Username "${data.username}" is already taken`);
  }
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    username: data.username,
    passwordHash: hashPassword(data.password),
    role: "club_admin",
    status: data.status ?? "active",
    clubSlugs: data.clubSlugs,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  writeStore(users);
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export function registerUser(data: {
  username: string;
  password: string;
}): SafeUser {
  return createUser({ username: data.username, password: data.password, clubSlugs: [], status: "pending" });
}

export function updateUser(
  id: string,
  data: {
    username?: string;
    password?: string;
    clubSlugs?: string[];
    status?: "active" | "pending";
    recipientName?: string | null;
    email?: string | null;
    preferredCurrency?: string | null;
  }
): SafeUser {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");

  if (data.username) {
    const collision = users.find(
      (u) => u.username.toLowerCase() === data.username!.toLowerCase() && u.id !== id
    );
    if (collision) throw new Error(`Username "${data.username}" is already taken`);
    users[idx].username = data.username;
  }
  if (data.password) {
    users[idx].passwordHash = hashPassword(data.password);
  }
  if (data.clubSlugs !== undefined) {
    users[idx].clubSlugs = data.clubSlugs;
  }
  if (data.status !== undefined) {
    users[idx].status = data.status;
  }
  if (data.recipientName !== undefined) {
    users[idx].recipientName = data.recipientName ?? undefined;
  }
  if (data.email !== undefined) {
    users[idx].email = data.email ?? undefined;
  }
  if (data.preferredCurrency !== undefined) {
    users[idx].preferredCurrency = data.preferredCurrency ?? undefined;
  }
  users[idx].updatedAt = new Date().toISOString();
  writeStore(users);
  const { passwordHash: _ph, ...safe } = users[idx];
  return safe;
}

export function getUserByInviteToken(token: string): User | undefined {
  const users = readStore();
  return users.find(
    (u) => u.inviteToken === token && u.inviteExpiry && new Date(u.inviteExpiry) > new Date()
  );
}

export function createInviteToken(id: string): { token: string; expiry: string } {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  users[idx].inviteToken = token;
  users[idx].inviteExpiry = expiry;
  users[idx].updatedAt = new Date().toISOString();
  writeStore(users);
  return { token, expiry };
}

export function acceptInvite(token: string, password: string): SafeUser {
  const users = readStore();
  const idx = users.findIndex(
    (u) => u.inviteToken === token && u.inviteExpiry && new Date(u.inviteExpiry) > new Date()
  );
  if (idx < 0) throw new Error("Invalid or expired invite link");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  users[idx].passwordHash = hashPassword(password);
  users[idx].status = "active";
  users[idx].inviteToken = undefined;
  users[idx].inviteExpiry = undefined;
  users[idx].updatedAt = new Date().toISOString();
  writeStore(users);
  const { passwordHash: _ph, ...safe } = users[idx];
  return safe;
}

export function updateUserBankDetails(id: string, bankDetails: BankDetails | null): SafeUser {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  users[idx].bankDetails = bankDetails ?? undefined;
  users[idx].updatedAt = new Date().toISOString();
  writeStore(users);
  const { passwordHash: _ph, ...safe } = users[idx];
  return safe;
}

export function deleteUser(id: string): boolean {
  const users = readStore();
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) return false;
  writeStore(next);
  return true;
}
