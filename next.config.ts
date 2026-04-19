import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [];

const explicitBase = process.env.JFAUTO_S3_PUBLIC_BASE_URL?.trim();
if (explicitBase) {
  try {
    const url = new URL(explicitBase);
    remotePatterns.push({
      protocol: url.protocol.replace(':', '') as 'https' | 'http',
      hostname: url.hostname,
      pathname: '/**',
    });
  } catch {
    // ignore invalid base url at config time
  }
} else {
  const bucket = process.env.JFAUTO_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  if (bucket) {
    remotePatterns.push({
      protocol: 'https',
      hostname: `${bucket}.s3.${region}.amazonaws.com`,
      pathname: '/**',
    });
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
