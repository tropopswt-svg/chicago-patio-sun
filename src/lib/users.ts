import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { User } from "./types";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");
const MAX_USERS = 1000;

function ensureFile() {
  const dir = path.dirname(USERS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(USERS_PATH)) writeFileSync(USERS_PATH, "[]");
}

export function loadUsers(): User[] {
  ensureFile();
  try {
    const raw = readFileSync(USERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  ensureFile();
  writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email: string): User | undefined {
  return loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return loadUsers().find((u) => u.id === id);
}

export function createUser(user: User): boolean {
  const users = loadUsers();
  if (users.length >= MAX_USERS) return false;
  if (users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) return false;
  users.push(user);
  saveUsers(users);
  return true;
}

export function updateUserFavorites(userId: string, favorites: string[]): boolean {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  users[idx].favorites = favorites;
  saveUsers(users);
  return true;
}
