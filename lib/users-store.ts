import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { put, list } from "@vercel/blob";

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
  role: "club_admin";
  status: "active" | "pending";
  clubSlugs: string[];
  recipientName?: string;
  email?: string;
  preferredCurrency?: string;
  inviteToken?: string;
  inviteExpiry?: string;
  bankDetails?: BankDetails;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

const BLOB_KEY = "users/all.json";
const TMP_FILE = "/tmp/users.json";
const SEED_FILE = path.join(process.cwd(), "data", "users.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Blob helpers ──────────────────────────────────────────────────────────────

async function blobRead(): Promise<User[]> {
  try {
    const { blobs } = await list({ prefix: "users/", limit: 10 });
    const match = blobs.find((b) => b.pathname === BLOB_KEY);
    if (!match) return [];
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as User[];
  } catch {
    return [];
  }
}

async function blobWrite(users: User[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(users, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ── File fallback ─────────────────────────────────────────────────────────────

function fileRead(): User[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as User[];
      }
    } catch { /* try next */ }
  }
  return [];
}

function fileWrite(users: User[]): void {
  const json = JSON.stringify(users, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on Vercel */ }
}

// ── Core read/write ───────────────────────────────────────────────────────────

async function readStore(): Promise<User[]> {
  if (!hasBlob()) return fileRead();
  const fromBlob = await blobRead();
  if (fromBlob.length > 0) return fromBlob;
  // Blob empty — migrate from seed file
  const fromFile = fileRead();
  if (fromFile.length > 0) await blobWrite(fromFile);
  return fromFile;
}

async function writeStore(users: User[]): Promise<void> {
  if (hasBlob()) {
    await blobWrite(users);
  } else {
    fileWrite(users);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + ":bs-accounting").digest("hex");
}

function toSafe(user: User): SafeUser {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<SafeUser[]> {
  return (await readStore()).map(toSafe);
}

export async function getUserById(id: string): Promise<User | undefined> {
  return (await readStore()).find((u) => u.id === id);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return (await readStore()).find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function verifyUserPassword(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  if (user.passwordHash !== hashPassword(password)) return null;
  return user;
}

export async function createUser(data: {
  username: string;
  password: string;
  clubSlugs: string[];
  status?: "active" | "pending";
}): Promise<SafeUser> {
  const users = await readStore();
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
  await writeStore(users);
  return toSafe(user);
}

export async function registerUser(data: { username: string; password: string }): Promise<SafeUser> {
  return createUser({ username: data.username, password: data.password, clubSlugs: [], status: "pending" });
}

export async function updateUser(
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
): Promise<SafeUser> {
  const users = await readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");

  if (data.username) {
    const collision = users.find(
      (u) => u.username.toLowerCase() === data.username!.toLowerCase() && u.id !== id
    );
    if (collision) throw new Error(`Username "${data.username}" is already taken`);
    users[idx].username = data.username;
  }
  if (data.password) users[idx].passwordHash = hashPassword(data.password);
  if (data.clubSlugs !== undefined) users[idx].clubSlugs = data.clubSlugs;
  if (data.status !== undefined) users[idx].status = data.status;
  if (data.recipientName !== undefined) users[idx].recipientName = data.recipientName ?? undefined;
  if (data.email !== undefined) users[idx].email = data.email ?? undefined;
  if (data.preferredCurrency !== undefined) users[idx].preferredCurrency = data.preferredCurrency ?? undefined;
  users[idx].updatedAt = new Date().toISOString();

  await writeStore(users);
  return toSafe(users[idx]);
}

export async function updateUserBankDetails(id: string, bankDetails: BankDetails | null): Promise<SafeUser> {
  const users = await readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  users[idx].bankDetails = bankDetails ?? undefined;
  users[idx].updatedAt = new Date().toISOString();
  await writeStore(users);
  return toSafe(users[idx]);
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await readStore();
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) return false;
  await writeStore(next);
  return true;
}

export async function getUserByInviteToken(token: string): Promise<User | undefined> {
  return (await readStore()).find(
    (u) => u.inviteToken === token && u.inviteExpiry && new Date(u.inviteExpiry) > new Date()
  );
}

export async function createInviteToken(id: string): Promise<{ token: string; expiry: string }> {
  const users = await readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  users[idx].inviteToken = token;
  users[idx].inviteExpiry = expiry;
  users[idx].updatedAt = new Date().toISOString();
  await writeStore(users);
  return { token, expiry };
}

export async function acceptInvite(token: string, password: string): Promise<SafeUser> {
  const users = await readStore();
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
  await writeStore(users);
  return toSafe(users[idx]);
}
