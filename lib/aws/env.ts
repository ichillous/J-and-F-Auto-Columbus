function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required AWS env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const awsEnv = {
  region: () => optional('AWS_REGION', 'us-east-1'),
  carsTable: () => optional('JFAUTO_CARS_TABLE', 'jfauto-cars'),
  leadsTable: () => optional('JFAUTO_LEADS_TABLE', 'jfauto-leads'),
  settingsTable: () => optional('JFAUTO_SETTINGS_TABLE', 'jfauto-settings'),
  s3Bucket: () => required('JFAUTO_S3_BUCKET'),
  s3PublicBaseUrl: () => {
    const explicit = process.env.JFAUTO_S3_PUBLIC_BASE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    return `https://${required('JFAUTO_S3_BUCKET')}.s3.${optional('AWS_REGION', 'us-east-1')}.amazonaws.com`;
  },
  cognitoUserPoolId: () => required('COGNITO_USER_POOL_ID'),
  cognitoClientId: () => required('COGNITO_CLIENT_ID'),
  adminAllowedEmail: () => process.env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase() || null,
};
