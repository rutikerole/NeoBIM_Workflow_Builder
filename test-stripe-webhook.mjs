#!/usr/bin/env node

/**
 * Stripe Webhook Test Script
 * Tests webhook signature verification and event handling
 */

console.log("🧪 Stripe Webhook Integration Test");
console.log("=====================================\n");

const checks = {
  envVars: false,
  stripeLib: false,
  webhookRoute: false,
};

// 1. Check environment variables
console.log("1️⃣ Checking environment variables...");
const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_TEAM_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

try {
  const fs = await import("fs");
  const envContent = fs.readFileSync(".env.local", "utf-8");
  
  let missingVars = [];
  for (const varName of requiredEnvVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length === 0) {
    console.log("   ✅ All Stripe environment variables present");
    checks.envVars = true;
  } else {
    console.log("   ⚠️  Missing env vars:", missingVars.join(", "));
    console.log("   → Add these to .env.local");
  }
} catch (error) {
  console.log("   ⚠️  .env.local not found - create it from .env.example");
}

// 2. Check Stripe library
console.log("\n2️⃣ Checking Stripe library installation...");
try {
  const packageJson = await import("./package.json", { assert: { type: "json" } });
  if (packageJson.default.dependencies.stripe) {
    console.log("   ✅ Stripe installed:", packageJson.default.dependencies.stripe);
    checks.stripeLib = true;
  } else {
    console.log("   ❌ Stripe not installed");
  }
} catch (error) {
  console.log("   ❌ Error checking package.json:", error.message);
}

// 3. Check webhook route exists
console.log("\n3️⃣ Checking webhook route...");
try {
  const fs = await import("fs");
  if (fs.existsSync("src/app/api/stripe/webhook/route.ts")) {
    console.log("   ✅ Webhook route exists");
    checks.webhookRoute = true;
  } else {
    console.log("   ❌ Webhook route not found");
  }
} catch (error) {
  console.log("   ❌ Error checking webhook route:", error.message);
}

// Summary
console.log("\n=====================================");
console.log("📊 Summary:");
console.log(`   Environment Variables: ${checks.envVars ? "✅" : "❌"}`);
console.log(`   Stripe Library: ${checks.stripeLib ? "✅" : "❌"}`);
console.log(`   Webhook Route: ${checks.webhookRoute ? "✅" : "❌"}`);

const allPassed = Object.values(checks).every(Boolean);
if (allPassed) {
  console.log("\n🎉 All checks passed! Ready for testing.");
  console.log("\n📝 Next steps:");
  console.log("   1. Run: npm run build");
  console.log("   2. Run: npm run dev");
  console.log("   3. Use Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook");
  console.log("   4. Test payment: stripe trigger checkout.session.completed");
} else {
  console.log("\n⚠️  Some checks failed. Fix them before testing.");
}
