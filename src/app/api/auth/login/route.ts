import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { findUserByEmail } from "@/lib/users";
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user: toSafeUser(user) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
