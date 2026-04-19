# J&F Auto — Car Dealership Website

A single-dealership marketing site + admin console built on Next.js 15 (App Router) and a fully AWS-native data plane: Cognito + DynamoDB + S3, deployed via AWS Amplify Hosting.

## Tech Stack

- **Framework**: Next.js 15 (App Router, standalone output)
- **Auth**: Amazon Cognito User Pool, ID token in HTTP-only cookie, JWKS verification via `aws-jwt-verify`
- **Data**: Amazon DynamoDB (3 tables) via `@aws-sdk/lib-dynamodb` Document Client
- **Storage**: Amazon S3 (presigned PUT URLs from a Node.js Route Handler)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: AWS Amplify Hosting (Next.js SSR)

## Architecture

```
Browser ──► Amplify Hosting (Next.js SSR)
              │
              ├── Server Actions / Server Components ──► DynamoDB (cars / leads / settings)
              ├── /api/admin/upload-url (Node)        ──► S3 presigned PUT URL
              ├── Admin login Server Action          ──► Cognito AdminInitiateAuth (ADMIN_USER_PASSWORD_AUTH)
              └── Session cookie (jfauto_session)    ──► verified per-request via Cognito JWKS
                                                          (cached with React.cache())
Browser ──► S3 (or CloudFront) directly for car images
```

Roles live as the `custom:role` Cognito attribute (`admin | staff | readonly`) and are read from the verified ID token — no profiles table.

## Required AWS Resources

| Resource | Notes |
| --- | --- |
| Cognito User Pool | Custom attribute `custom:role` (mutable string). App client with `ADMIN_USER_PASSWORD_AUTH` enabled. |
| DynamoDB tables | `jfauto-cars`, `jfauto-leads`, `jfauto-settings`. Partition key `id` (string) on all three. |
| S3 bucket | Public-read or fronted by CloudFront. Bucket policy must allow `s3:PutObject` from the Amplify compute role for the `cars/` prefix. CORS allows `PUT` from the site origin. |
| Amplify Hosting | Connected to the repo. Uses `amplify.yml`. The compute role needs DynamoDB CRUD on the three tables, `s3:PutObject` on the bucket, and `cognito-idp:AdminInitiateAuth` + `AdminUpdateUserAttributes` on the user pool. |

## Environment Variables

See `.env.example`. Required at runtime:

- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `JFAUTO_S3_BUCKET`

Optional (with defaults):

- `AWS_REGION` (default `us-east-1`)
- `JFAUTO_CARS_TABLE`, `JFAUTO_LEADS_TABLE`, `JFAUTO_SETTINGS_TABLE`
- `JFAUTO_S3_PUBLIC_BASE_URL` (set to your CloudFront domain if used)
- `NEXT_PUBLIC_SITE_URL` (only used for `metadataBase`)

In Amplify Hosting, prefer the platform-provided IAM role over `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

## Local Development

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev
```

Dev runs against the same AWS resources you point it at — there is no local database.

## Deployment (AWS Amplify Hosting)

1. Push the repo to GitHub.
2. In AWS Amplify Hosting, create a new app from the GitHub repository.
3. Amplify will detect `amplify.yml` automatically.
4. Configure environment variables (see above) in Amplify → App settings → Environment variables.
5. Attach an IAM role to the Amplify compute with the permissions listed under *Required AWS Resources*.
6. Trigger a build.

## Project Structure

```
app/
├── admin/                # Admin console (Cognito-protected)
├── api/admin/upload-url/ # Presigned S3 PUT endpoint (Node runtime)
├── cars/[slug]/          # Public car detail
├── inventory/            # Public inventory listing
├── contact/              # Public contact form
└── page.tsx              # Public home page
components/
├── admin/                # Admin UI (server actions consumers)
└── ui/                   # shadcn/ui primitives
lib/
├── actions/              # 'use server' Server Actions
├── aws/                  # env, clients, cognito, s3 helpers
├── auth.ts               # getSession / requireRole / requireAdmin
├── data.ts               # DynamoDB CRUD
└── types.ts
middleware.ts             # Cookie presence check on /admin/*
```

## Roles

- **admin** — full access including settings
- **staff** — manage cars and leads
- **readonly** — read-only dashboard / leads

## License

MIT
