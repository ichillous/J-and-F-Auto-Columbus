import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

import { awsEnv } from './env';

let _doc: DynamoDBDocumentClient | null = null;
export function ddb(): DynamoDBDocumentClient {
  if (_doc) return _doc;
  const raw = new DynamoDBClient({ region: awsEnv.region() });
  _doc = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  });
  return _doc;
}

let _s3: S3Client | null = null;
export function s3(): S3Client {
  if (!_s3) _s3 = new S3Client({ region: awsEnv.region() });
  return _s3;
}

let _cognito: CognitoIdentityProviderClient | null = null;
export function cognito(): CognitoIdentityProviderClient {
  if (!_cognito) _cognito = new CognitoIdentityProviderClient({ region: awsEnv.region() });
  return _cognito;
}
