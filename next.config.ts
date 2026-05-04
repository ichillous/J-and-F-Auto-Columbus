import type { NextConfig } from 'next';

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

const remotePatterns: RemotePattern[] = [];
const seenHostnames = new Set<string>();

function addHost(protocol: 'https' | 'http', hostname: string) {
  const key = `${protocol}://${hostname}`;
  if (seenHostnames.has(key)) return;
  seenHostnames.add(key);
  remotePatterns.push({ protocol, hostname, pathname: '/**' });
}

const explicitBase = process.env.JFAUTO_S3_PUBLIC_BASE_URL?.trim();
if (explicitBase) {
  try {
    const url = new URL(explicitBase);
    addHost(url.protocol.replace(':', '') as 'https' | 'http', url.hostname);
  } catch {
    // ignore invalid base url at config time
  }
}

const bucket = process.env.JFAUTO_S3_BUCKET?.trim();
const region = process.env.AWS_REGION?.trim() || 'us-east-1';
if (bucket) {
  addHost('https', `${bucket}.s3.${region}.amazonaws.com`);
}

// Escape hatch: comma-separated list of extra hostnames (or full URLs) to allow
// for next/image. Useful when the derived hostname doesn't match the deployed
// bucket (e.g. bucket rename, CloudFront alias, region mismatch at build time).
const extraHosts = process.env.JFAUTO_IMAGE_ALLOWED_HOSTS?.trim();
if (extraHosts) {
  for (const entry of extraHosts.split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      const url = new URL(entry.includes('://') ? entry : `https://${entry}`);
      addHost(url.protocol.replace(':', '') as 'https' | 'http', url.hostname);
    } catch {
      // skip malformed entries
    }
  }
}

if (remotePatterns.length === 0) {
  console.warn(
    '[next.config] images.remotePatterns is empty. /_next/image will 403 for every remote URL. ' +
      'Set JFAUTO_S3_PUBLIC_BASE_URL, JFAUTO_S3_BUCKET+AWS_REGION, or JFAUTO_IMAGE_ALLOWED_HOSTS.',
  );
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
