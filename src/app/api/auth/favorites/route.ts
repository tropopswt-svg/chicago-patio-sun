import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, toSafeUser } from "@/lib/auth";
import { findUserById, updateUserFavorites } from "@/lib/users";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ favorites: user.favorites });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { patioId } = await request.json();
    if (!patioId || typeof patioId !== "string") {
      return NextResponse.json({ error: "patioId is required" }, { status: 400 });
    }

    const favorites = user.favorites.includes(patioId)
      ? user.favorites.filter((id) => id !== patioId)
      : [...user.favorites, patioId];

    updateUserFavorites(userId, favorites);

    return NextResponse.json({ favorites, user: toSafeUser({ ...user, favorites }) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
