# CONTRACT_QUESTIONS.md

## Upstream Contract Review Questions

### 1. `POST /estates/{estateId}/driver-interests` — `contactMethod`

The request body only marks `userId` as required, while `contactMethod` is optional.

Is `contactMethod` intentionally optional, or should it be required so that SkillBridge has a way to contact a user who has registered interest in delivery work?

### 2. `GET /customers/payment-method` — Customer Scope

The endpoint returns a list containing `customerId` and `paymentMethod` for customers, and its description says the information is used to determine Skill Coin purchase prompt eligibility.

Does this endpoint intentionally return payment-method information for all customers, or should it accept a `customerId` parameter so SkillBridge can retrieve the payment method for a specific customer?

### 3. `GET /estates` — `deliveryStatus`

The endpoint summary says it returns estates "with active delivery schedules," but the `deliveryStatus` query parameter allows both `active` and `inactive` values.

When `deliveryStatus=inactive` is supplied, should the endpoint return estates with inactive delivery schedules as well, or should this endpoint only return estates with active schedules?