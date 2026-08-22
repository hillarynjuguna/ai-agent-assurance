# Environment Variables Reference

Copy `.env.local.example` to `.env.local` for local development.

```env
# Public Product Links
NEXT_PUBLIC_GUMROAD_REPORT_URL="https://hillarynjuguna.gumroad.com/l/agent-trust-readiness-report"
NEXT_PUBLIC_GUMROAD_EXPERT_URL="https://hillarynjuguna.gumroad.com/l/founder-trust-review"

# Gumroad Server API & Product Verification
GUMROAD_REPORT_PRODUCT_ID="uazesx"
GUMROAD_REVIEW_PRODUCT_ID="hd8oOeH9NheiiQ_v6RFBGQ=="
GUMROAD_PING_SECRET="your_shared_ping_secret_here"

# Security & Admin Access
ADMIN_ACCESS_TOKEN="change_this_secure_admin_token"

# Storage Persistence Switch
# Modes implemented: 'file' (local dev), 'kv' (production Vercel KV), 'memory' (tests)
REPORT_STORE_MODE="kv"
```
