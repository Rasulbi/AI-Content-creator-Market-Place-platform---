# Future Payment Integration Architecture & Requirements Specification

> **IMPORTANT STATUS NOTICE & DISCLAIMER**  
> **Current Platform State:** Payment processing, digital wallets, and automated escrow features are **not operational** on this platform. This document outlines an architectural blueprint and compliance roadmap for **future phases** only.  
> **Regulatory Notice:** Razorpay Route marketplace access has **not been requested or approved**. Legal escrow is **not provided**. Under Reserve Bank of India (RBI) Payment Aggregator (PA) guidelines, non-banking marketplace entities may not hold third-party funds directly in generic bank accounts; all future settlements must utilize licensed payment aggregator escrow/nodal mechanisms or direct split settlements (such as Razorpay Route) strictly subject to formal underwriting and regulatory approval.

---

## 1. Executive Summary & Objective

This document defines the technical architecture, data model, security requirements, and regulatory pre-requisites for integrating **Razorpay** into the AI Creator Marketplace in a future phase.

The marketplace currently facilitates:
- Brand campaign creation and creator discovery.
- AI-driven skill matching and multi-factor profile verification.
- Formal collaboration invitations, creator proposal acceptance, and collaboration status tracking (`invited` → `accepted` → `hired`).

Future payment integration will introduce automated payment capture, milestone tracking, and linked split payouts without disrupting the current invitation and hiring workflow.

---

## 2. Phased Architecture & Regulatory Compliance

### Phase A: Business & Regulatory Pre-Requisites (Before Implementation)
1. **Entity Legal Registration**: The operating entity must possess an active GSTIN, corporate bank account, and PAN in India.
2. **Razorpay Route Marketplace Underwriting**:
   - Razorpay Route enables a platform to split customer payments between the platform commission and vendor/creator linked accounts.
   - Marketplace settlement arrangements require explicit approval from Razorpay Risk and Compliance under RBI Master Directions for Payment Aggregators.
   - The platform cannot self-label as an "Escrow Service" without licensed trustee/banking arrangements. All marketing and transactional copy must use compliant terminology (e.g., *"Milestone-Secured Split Settlement"* or *"Delayed Settlement Release"*).
3. **Terms of Service & Platform Policies**:
   - Publish legally binding Terms of Service, Cancellation & Refund Policy, and Privacy Policy detailing platform fee structures, dispute windows, and tax deduction liabilities (TDS under Section 194-O of the Income Tax Act).

### Phase B: Sandbox & Test Mode Validation (Pre-Production)
- Full end-to-end integration test execution using Razorpay Test Mode API keys (`rzp_test_...`).
- Automated webhook simulation with valid and invalid HMAC-SHA256 signatures.
- Replay attack testing and duplicate event deduplication.

### Phase C: Controlled Production Pilot
- Limited rollout with a small cohort of verified brands and onboarding creators before general availability.

---

## 3. Data Model & Database Architecture (Future Schema Design)

When future payment integration is scheduled, the Supabase PostgreSQL database will be extended with the following normalized tables and Row Level Security (RLS) policies:

### 3.1 New Tables

```sql
-- 1. Contracts Table (links an accepted match to commercial agreement)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  creator_profile_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  platform_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  creator_payout_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_funding', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled')),
  terms_agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Milestones Table (deliverable stages per contract)
CREATE TABLE contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  milestone_number INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  deliverable_description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'funded', 'submitted', 'approved', 'released', 'refunded', 'disputed')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, milestone_number)
);

-- 3. Payment Transactions Table (immutable audit log of gateway events)
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  milestone_id UUID REFERENCES contract_milestones(id) ON DELETE SET NULL,
  razorpay_order_id VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  razorpay_transfer_id VARCHAR(100) UNIQUE,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  transaction_type VARCHAR(30) NOT NULL 
    CHECK (transaction_type IN ('order_created', 'payment_captured', 'route_transfer', 'refund', 'fee_deduction')),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) NOT NULL 
    CHECK (status IN ('initiated', 'processing', 'successful', 'failed', 'reversed')),
  gateway_response JSONB,
  error_code VARCHAR(100),
  error_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Creator Linked Accounts (Razorpay Route sub-merchant onboarding)
CREATE TABLE creator_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id UUID NOT NULL UNIQUE REFERENCES creator_profiles(id) ON DELETE CASCADE,
  razorpay_account_id VARCHAR(100) NOT NULL UNIQUE,
  account_type VARCHAR(30) NOT NULL DEFAULT 'route_linked',
  payout_status VARCHAR(30) NOT NULL DEFAULT 'under_review'
    CHECK (payout_status IN ('under_review', 'active', 'suspended', 'rejected')),
  legal_business_name VARCHAR(255) NOT NULL,
  pan_last4 VARCHAR(4),
  bank_account_last4 VARCHAR(4),
  ifsc_code VARCHAR(11),
  kyc_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Webhook Events Log (deduplication & replay attack protection)
CREATE TABLE webhook_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Row Level Security (RLS) Policies

All tables must enforce strict tenant isolation:
- `contracts`: Brands can read/insert contracts where `brand_id = auth.uid()`. Creators can read contracts where `creator_profile_id` belongs to their authenticated user.
- `contract_milestones`: Read access granted to the participating brand and creator. Milestone approval actions restricted to the brand owner.
- `payment_transactions`: Read access restricted to the contract parties. Direct write access strictly prohibited for client roles; insertions allowed only through service role context via Server Actions or Webhook handlers.
- `creator_payment_accounts`: Read/write strictly restricted to the owning creator profile (`creator_profiles.user_id = auth.uid()`). Sensitive tokens and API credentials never stored in this table.

---

## 4. Integration Technical Flow

### 4.1 Order Creation & Brand Checkout
```
Brand Dashboard                    Next.js Server Route                  Razorpay Gateway
     │                                      │                                    │
     │ 1. Initiate Milestone Funding        │                                    │
     ├─────────────────────────────────────►│                                    │
     │    (contractId, milestoneId)         │ 2. Validate ownership & state      │
     │                                      │ 3. Create Razorpay Order           │
     │                                      ├───────────────────────────────────►│
     │                                      │    (amount, currency, notes)       │
     │                                      │◄───────────────────────────────────┤
     │                                      │    Returns order_id                │
     │ 4. Return order_id + options         │                                    │
     │◄─────────────────────────────────────┤                                    │
     │                                                                           │
     │ 5. Open Razorpay Checkout Modal (client-side)                             │
     ├──────────────────────────────────────────────────────────────────────────►│
     │    (Card / UPI / NetBanking)                                              │
     │                                                                           │
     │ 6. Payment Success (returns razorpay_payment_id, signature)               │
     │◄──────────────────────────────────────────────────────────────────────────┤
     │                                                                           │
     │ 7. Submit Payment Verification                                            │
     ├─────────────────────────────────────►│                                    │
     │    (orderId, paymentId, signature)   │ 8. Verify HMAC-SHA256 signature    │
     │                                      │ 9. Record payment_transaction      │
     │                                      │ 10. Update milestone to 'funded'   │
     │ 11. Collaboration status updated     │                                    │
     │◄─────────────────────────────────────┤                                    │
```

### 4.2 Signature Verification Standard (Node.js Server-Side)
Verification MUST happen on the server using Node's crypto library before updating any database record:
```typescript
import crypto from "crypto";

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const generatedSignature = crypto
    .createHmac("sha256", params.secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, "utf-8"),
    Buffer.from(params.signature, "utf-8")
  );
}
```

---

## 5. Webhook Handling & Duplicate-Event Protection

Because network drops or client crashes can prevent the browser from submitting the checkout callback, webhooks are mandatory as the authoritative source of truth:

1. **Webhook Endpoint**: `POST /api/webhooks/razorpay`
2. **Signature Verification**: Every incoming webhook must have its `x-razorpay-signature` header validated against `RAZORPAY_WEBHOOK_SECRET` before parsing the JSON body.
3. **Event Deduplication**:
   - Check `event_id` against `webhook_events_log`.
   - If `event_id` already exists, immediately acknowledge with HTTP 200 OK without re-executing business logic.
4. **Supported Events**:
   - `order.paid`: Confirms brand funding.
   - `payment.captured`: Confirms funds captured in Razorpay nodal account.
   - `transfer.processed`: Confirms release to creator linked account.
   - `refund.processed`: Records milestone cancellation or dispute refund.

---

## 6. Creator Split Settlement (Razorpay Route)

When a brand approves a milestone deliverable:
1. Brand clicks **"Approve Deliverable & Release Milestone"**.
2. Server verifies that the milestone is in `'submitted'` state and that the caller is the campaign owner.
3. Server invokes Razorpay Route Transfer API:
   - Platform fee (e.g., 10%) retained in platform balance.
   - Net milestone amount (90% minus TDS if applicable) transferred to creator's linked account:
     ```json
     {
       "transfers": [
         {
           "account": "acc_creator_linked_id",
           "amount": 2700000,
           "currency": "INR",
           "notes": {
             "contract_id": "...",
             "milestone_id": "..."
           }
         }
       ]
     }
     ```
4. Transfer record saved with unique `idempotency_key` preventing multiple payouts for the same milestone.
5. Milestone state transitions from `'submitted'` → `'released'`.

---

## 7. Refunds, Disputes & Reconciliation

1. **Refund Logic**:
   - If a project is cancelled by mutual consent before creator submission, brand funding is refunded via Razorpay Refund API (`/v1/payments/{payment_id}/refund`).
   - If already split to Route linked accounts, a transfer reversal (`/v1/transfers/{transfer_id}/reversals`) must be executed prior to customer refund.
2. **Dispute Resolution Period**:
   - A standard 7-day review window after creator deliverable submission.
   - If a brand fails to review or dispute within 7 days, an automated escalation or mediation notice is triggered.
3. **Financial Audit Trail**:
   - Every debit, credit, fee deduction, and reversal must generate an immutable row in `payment_transactions`.

---

## 8. Summary Checklist Before Any Payment Implementation

- [ ] Obtain formal approval and underwriting for Razorpay Route.
- [ ] Complete corporate KYC and bank account verification.
- [ ] Formalize platform Terms of Service, Privacy Policy, and Refund Policy with legal counsel.
- [ ] Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to server environment variables only (never exposed client-side).
- [ ] Author and execute Supabase database migrations for contracts, milestones, transactions, and webhook logs.
- [ ] Implement and verify RLS policies in staging environment.
- [ ] Complete automated test suite covering order creation, signature verification, webhook deduplication, and transfer idempotency.
