## TrustStamp Certificate Validator 
A web app to register, verify, and manage documents (like certificates) on the Hedera public ledger.

#### Features
- Register Documents: Upload and notarize PDFs on Hedera.
- Verify Documents: Instantly check document authenticity.
- User Accounts: Secure login, profile, and document dashboard.
- API Access: Generate API keys to automate document registration and verification.
- Hedera Integration: All actions are recorded on the Hedera network for transparency.

#### Getting Started
- Install dependencies
`pnpm install`
- Set up environment variables
Add your Hedera credentials and any storage/API keys to .env.local.
- Add your Hedera credentials and any storage/API keys to .env.local.
Run the development server:
`pnpm dev`

Open the app:

`Visit http://localhost:3000`

#### Usage
- Register: Sign in and upload a PDF to register it on Hedera.
- Verify: Use the “Verify” page to check any document.
- API: Create an API key from your profile to use the API for automation.

### Tech Stack
Next.js (App Router)
Convex (backend/database)
Hedera SDK
Vercel (deployment)