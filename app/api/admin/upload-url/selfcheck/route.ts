import { NextResponse } from 'next/server';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

import { getSession } from '@/lib/auth';
import { s3 } from '@/lib/aws/clients';
import { awsEnv } from '@/lib/aws/env';
import { presignUpload } from '@/lib/aws/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const diag: {
    region: string;
    bucket: string | null;
    publicBaseUrl: string | null;
    headBucket: 'ok' | null;
    presignOk: boolean;
    presignHost: string | null;
    error: string | null;
  } = {
    region: awsEnv.region(),
    bucket: null,
    publicBaseUrl: null,
    headBucket: null,
    presignOk: false,
    presignHost: null,
    error: null,
  };

  try {
    diag.bucket = awsEnv.s3Bucket();
    diag.publicBaseUrl = awsEnv.s3PublicBaseUrl();
    await s3().send(new HeadBucketCommand({ Bucket: diag.bucket }));
    diag.headBucket = 'ok';
    const presign = await presignUpload({
      contentType: 'image/jpeg',
      contentLength: 1,
      filename: 'selfcheck-probe.jpg',
    });
    diag.presignOk = true;
    diag.presignHost = new URL(presign.uploadUrl).host;
  } catch (err) {
    diag.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json(diag, { status: 500 });
  }
  return NextResponse.json(diag);
}
