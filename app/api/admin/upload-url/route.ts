import { NextResponse } from 'next/server';

import { requireAdminOrStaff } from '@/lib/auth';
import { presignUpload } from '@/lib/aws/s3';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  await requireAdminOrStaff();
  let body: { contentType?: string; contentLength?: number; filename?: string; carId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.contentType || !body.filename || typeof body.contentLength !== 'number') {
    return NextResponse.json({ error: 'contentType, contentLength, filename required' }, { status: 400 });
  }
  try {
    const result = await presignUpload({
      contentType: body.contentType,
      contentLength: body.contentLength,
      filename: body.filename,
      carId: body.carId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to presign upload' },
      { status: 400 },
    );
  }
}
