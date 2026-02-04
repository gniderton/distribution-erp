# 📖 Case Study: From Order to Invoice (with Schemes)

This document provides a clear, step-by-step breakdown of how a Sales Order is processed when multiple scheme types are active.

## 1. The Scenario
A customer orders a mix of products that qualify for different incentive programs.

### 🏷️ Active Schemes in Database:
*   **Buy 10 Get 1 Free (BGF)**: Applied to *Sauce A*. (If you buy 10, you get 1 extra).
*   **Sauce Basket (Combo)**: Applied to *Mixed Basket* of A and B. (Buy any 24 mixed -> Get 1 Free).
*   **Bulk Slab (Price Slab)**: Applied to *Sauce C*. (Buy 100+ -> **Net Rate** drops to 75.00).

---

## 2. The Sales Order 📝
The customer places the following order:

| Product | Ordered Qty | Reference Rate (Excl Tax) |
|---------|-------------|---------------------------|
| **Sauce A** | 50 | 90.00 |
| **Sauce B** | 24 | 90.00 |
| **Sauce C** | 100 | 90.00 |

---

## 3. Scheme Engine Execution 🎁
The engine processes the order in phases based on **priority** to ensure fair stock consumption.

### Step A: Single Item Logic (Priority 1)
*   **Target**: Sauce A (50 Units).
*   **Requirement**: Buy 10 Get 1 Free.
*   **Math**: `50 / 10 = 5` (5 rewards hit).
*   **Reward**: `5 units` of Sauce A for free.
*   **Stock Consumed**: `5 hits * 10 units = 50 units`.
    *   *Result: All 50 units of Sauce A are now "spent" for the BGF scheme.*

### Step B: Combo Bucket Sum (Priority 2)
*   **Input**: Sauce A (**0** units remaining) + Sauce B (**24** units remaining) = **24 Units Total**.
*   **Requirement**: 24 units mixed per reward.
*   **Math**: `24 / 24 = 1` (1 hit).
*   **Reward**: `1 unit` of Sauce B for free.
*   **Stock Consumed**: `24 units`.
    *   *Result: All 24 units of Sauce B are now "spent".*

### Step C: Price Slab Logic
*   **Calculation Type**: Tax-Inclusive Net target.
*   **Target Net**: 75.00.
*   **Formula**: `Deduction = (Rate - (Net_Target / (1 + Tax% / 100))) * Qty`
*   **Math**: `(90 - (75 / 1.18)) = 26.44` deduction per unit.

---

## 4. Final Invoice Breakdown 🧾
The dispatcher keeps the **Unit Rate constant** and records all benefits in the `Scheme Amt` column.

| Product | Ordered | Free | Total Shipped | Rate | Gross | Scheme Amt | Taxable | Net (Inc 18% Tax) |
|---------|---------|------|---------------|------|-------|------------|---------|-------------------|
| **Sauce A** | 50 | 5 | 55 | 90.00 | 4950.00 | 450.00 | 4500.00 | **5310.00** |
| **Sauce B** | 24 | 1 | 25 | 90.00 | 2250.00 | 90.00 | 2160.00 | **2548.80** |
| **Sauce C** | 100 | 0 | 100 | 90.00 | 9000.00 | 2644.07 | 6355.93 | **7500.00** |

### 💰 Total Payable: 15,358.80

> [!TIP]
> **Priority Matters!**
> Because BGF was Priority 1, it consumed Sauce A first. If Sauce Basket were Priority 1, it would have used both A and B to give a larger combo reward, potentially leaving nothing for the BGF scheme.

> [!IMPORTANT]
> **Price Slab Formula**
> We calculate the discount as a taxable deduction. This ensures the ledger reflects the true Gross vs. Discount while hitting the exact Net Price (e.g., 75.00) requested by the user.
