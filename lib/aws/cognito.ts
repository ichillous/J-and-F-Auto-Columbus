import { createHmac } from 'node:crypto';

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { cognito } from './clients';
import { awsEnv } from './env';
import type { ProfileRole } from '@/lib/types';

function buildAuthParams(base: Record<string, string>, username: string): Record<string, string> {
  const secret = awsEnv.cognitoClientSecret();
  if (!secret) return base;
  const hash = createHmac('sha256', secret)
    .update(username + awsEnv.cognitoClientId())
    .digest('base64');
  return { ...base, SECRET_HASH: hash };
}

let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function verifier() {
  if (_verifier) return _verifier;
  _verifier = CognitoJwtVerifier.create({
    userPoolId: awsEnv.cognitoUserPoolId(),
    tokenUse: 'id',
    clientId: awsEnv.cognitoClientId(),
  });
  return _verifier;
}

export interface AdminSession {
  sub: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
}

const VALID_ROLES: ProfileRole[] = ['admin', 'staff', 'readonly'];

function parseRole(raw: unknown): ProfileRole | null {
  if (typeof raw === 'string' && (VALID_ROLES as string[]).includes(raw)) {
    return raw as ProfileRole;
  }
  return null;
}

export async function verifySessionToken(idToken: string): Promise<AdminSession | null> {
  try {
    const payload = await verifier().verify(idToken);
    const role = parseRole(payload['custom:role']);
    if (!role) {
      console.error('verifySessionToken: missing or invalid custom:role claim', { sub: payload.sub });
      return null;
    }
    const email = String(payload.email ?? '').toLowerCase();
    const allowed = awsEnv.adminAllowedEmail();
    if (allowed && email !== allowed) {
      console.error('verifySessionToken: email not in allowlist', { email });
      return null;
    }
    return {
      sub: String(payload.sub),
      email,
      fullName: typeof payload.name === 'string' ? payload.name : null,
      role,
    };
  } catch {
    return null;
  }
}

export interface LoginResult {
  idToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const result = await cognito().send(
    new AdminInitiateAuthCommand({
      UserPoolId: awsEnv.cognitoUserPoolId(),
      ClientId: awsEnv.cognitoClientId(),
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: buildAuthParams({ USERNAME: email, PASSWORD: password }, email),
    }),
  );

  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    throw new Error('Password reset required. Use the AWS Cognito console to set a permanent password.');
  }

  const auth = result.AuthenticationResult;
  if (!auth?.IdToken) {
    throw new Error('Login failed: no token returned');
  }
  return {
    idToken: auth.IdToken,
    refreshToken: auth.RefreshToken ?? null,
    expiresInSeconds: auth.ExpiresIn ?? 3600,
  };
}

export async function updateUserFullName(email: string, fullName: string | null): Promise<void> {
  await cognito().send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: awsEnv.cognitoUserPoolId(),
      Username: email,
      UserAttributes: [{ Name: 'name', Value: fullName ?? '' }],
    }),
  );
}

export async function respondToNewPasswordChallenge(
  email: string,
  newPassword: string,
  session: string,
): Promise<LoginResult> {
  const result = await cognito().send(
    new AdminRespondToAuthChallengeCommand({
      UserPoolId: awsEnv.cognitoUserPoolId(),
      ClientId: awsEnv.cognitoClientId(),
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: session,
      ChallengeResponses: buildAuthParams({ USERNAME: email, NEW_PASSWORD: newPassword }, email),
    }),
  );
  const auth = result.AuthenticationResult;
  if (!auth?.IdToken) throw new Error('Password change failed');
  return {
    idToken: auth.IdToken,
    refreshToken: auth.RefreshToken ?? null,
    expiresInSeconds: auth.ExpiresIn ?? 3600,
  };
}
