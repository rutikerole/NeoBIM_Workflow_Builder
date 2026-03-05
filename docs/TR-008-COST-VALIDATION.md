# TR-008 Cost Mapper - Construction Engineer Validation

## Overview
TR-008 BOQ/Cost Mapper has been upgraded with realistic construction unit rates and regional cost factors.

## Changes Implemented

### 1. Realistic Unit Rates (USD Baseline)

#### Concrete ($150-300/CY)
- Slab on Grade: $150/CY
- Elevated Slab: $200/CY
- Foundation: $180/CY
- Columns: $250/CY
- Beams: $220/CY
- Walls: $190/CY
- Stairs: $300/CY

#### Steel ($3000-6000/ton)
- Structural Steel (Beams & Columns): $3500/ton
- Steel Joist: $3200/ton
- Rebar: $2800/ton
- Steel Deck: $4.50/SF
- Steel Stud Framing: $3.20/SF

#### Masonry
- CMU Block Wall (8"): $12/SF
- Brick Veneer: $18/SF
- Stone Veneer: $35/SF
- Glass Block: $45/SF

#### Doors & Windows
- Hollow Metal Door & Frame: $850/EA
- Wood Door: $650/EA
- Storefront Door: $2200/EA
- Double-Glazed Window: $65/SF
- Curtain Wall: $120/SF
- Skylight: $95/SF

#### Finishes
- Drywall: $2.80/SF
- Ceramic Tile: $15/SF
- VCT Flooring: $6/SF
- Hardwood: $22/SF
- Commercial Carpet: $8/SF
- Acoustic Ceiling: $5.50/SF
- Interior Paint: $1.50/SF

#### Roofing
- Built-Up Roofing: $8.50/SF
- Single-Ply Membrane: $7/SF
- Metal Roofing: $12/SF
- Asphalt Shingle: $5.50/SF

#### MEP (per SF of building area)
- HVAC System: $18/SF
- Plumbing Rough-In: $8/SF
- Electrical Rough-In: $12/SF
- Fire Sprinkler: $6/SF
- Lighting: $7/SF

#### Sitework
- Excavation: $12/CY
- Grading: $0.80/SF
- Asphalt Paving: $6/SF
- Concrete Sidewalk: $8.50/SF
- Site Utilities: $45/LF

### 2. Regional Cost Factors

| Region | Multiplier | Notes |
|--------|------------|-------|
| **High-Cost US** | | |
| NYC | 1.30x | Union labor, logistics |
| San Francisco | 1.28x | High labor + seismic |
| Los Angeles | 1.15x | Above-average + seismic |
| Chicago | 1.10x | Union, winter impacts |
| **Mid-Cost US** | | |
| Houston | 0.95x | Lower labor, materials |
| Atlanta | 0.92x | Below-average |
| Phoenix | 0.90x | Low labor |
| **Europe** | | |
| London | 1.22x | High costs (GBP) |
| Munich | 1.18x | High EU (EUR) |
| Paris | 1.15x | Above-average EU |
| Amsterdam | 1.12x | Complex regs |
| Berlin | 1.05x | Average EU |
| Madrid | 0.95x | Lower EU |
| **Asia** | | |
| Mumbai | 0.40x | Low labor (INR) |
| Bangalore | 0.42x | Slightly higher |
| Delhi | 0.45x | Capital premium |
| Dubai | 0.85x | Low labor, high materials |
| Singapore | 1.08x | High-cost Asian city |
| Tokyo | 1.20x | High + seismic |
| **Other** | | |
| Sydney | 1.12x | High costs (AUD) |
| Toronto | 1.05x | Moderate (CAD) |
| Mexico City | 0.65x | Lower costs |
| São Paulo | 0.70x | Moderate LATAM |

### 3. Hard Costs vs Soft Costs Separation

**Hard Costs (Direct Construction):**
- All material and labor for physical construction
- Calculated line-by-line with unit rates

**Soft Costs (Indirect):**
- Architectural Fees: 8%
- Structural Engineering: 2%
- MEP Engineering: 3.5%
- Civil Engineering: 1.5%
- Permits & Inspections: 2%
- GC Overhead & Profit: 18%
- Contingency: 10% (design phase)
- Insurance & Bonding: 2.5%

**Total Soft Costs: ~47.5% of Hard Costs**

### 4. Data Sources
- RSMeans 2024/2025
- Industry averages (US, Europe, Asia)
- Vendor quotes
- Historical project data

## Validation Checklist

### Construction Engineer Review:

- [ ] **Concrete rates** ($150-300/CY) — realistic for different pours?
- [ ] **Steel rates** ($3000-6000/ton) — current market aligned?
- [ ] **Masonry rates** — brick/CMU/stone pricing correct?
- [ ] **Window/door pricing** — aluminum vs wood vs steel accurate?
- [ ] **MEP rates** ($/SF) — comprehensive system pricing?
- [ ] **Regional factors** — NYC 1.3x, Mumbai 0.4x reasonable?
- [ ] **Soft cost percentages** — architect 8%, GC O&P 18%, contingency 10%?
- [ ] **Currency conversions** — GBP, EUR, INR, AED exchange rates?
- [ ] **Missing items** — any critical categories omitted?
- [ ] **Typical project test** — run sample building, validate total cost?

## Test Case

**Sample Input:**
- Concrete Slab on Grade: 500 CY
- Structural Steel: 50 tons
- CMU Wall: 10,000 SF
- Double-Glazed Windows: 2,000 SF
- Region: New York City

**Expected Output:**
- Hard Costs: Calculate + apply NYC 1.3x multiplier
- Soft Costs: ~47.5% on top
- Total: Realistic for NYC mid-rise commercial project

## Sign-Off

**Reviewed by:** ______________________ (Construction Engineer)  
**Date:** ______________________  
**Status:** ☐ Approved  ☐ Needs Revision  
**Notes:**

---

**Implementation:** `src/lib/cost-database.ts` + `src/app/api/execute-node/route.ts`  
**Version:** v1.0  
**Last Updated:** March 5, 2026
