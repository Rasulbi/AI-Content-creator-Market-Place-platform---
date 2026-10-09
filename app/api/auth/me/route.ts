import { NextRequest, NextResponse } from "next/server";
import { usersDb } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("ai_user_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const parsed = JSON.parse(sessionCookie);
    const user = usersDb.findById(parsed.id) || parsed;

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (_e) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.delete("ai_user_session");
  return response;
}
