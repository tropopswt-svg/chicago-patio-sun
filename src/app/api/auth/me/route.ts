import { NextResponse } from "next/server";
import { getSessionUserId, toSafeUser } from "@/lib/auth";
import { findUserById } from "@/lib/users";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: toSafeUser(user) });
}
