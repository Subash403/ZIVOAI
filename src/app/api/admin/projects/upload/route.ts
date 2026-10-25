import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: 'This upload endpoint no longer accepts file bodies. Start a direct upload first.' },
    { status: 410 }
  );
}
