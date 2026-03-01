import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createUser, findUserByEmail } from "@/lib/users";
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (typeof email !== "string" || !email.includes("@") || email.length > 200) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (typeof firstName !== "string" || firstName.length > 50 || typeof lastName !== "string" || lastName.length > 50) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    const user: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash,
      favorites: [],
      createdAt: new Date().toISOString(),
    };

    const created = createUser(user);
    if (!created) {
      return NextResponse.json({ error: "Unable to create account. Maximum users reached." }, { status: 507 });
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user: toSafeUser(user) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
