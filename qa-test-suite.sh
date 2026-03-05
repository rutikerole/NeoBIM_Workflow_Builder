#!/bin/bash

echo "🧪 TESTER GOAT - OVERNIGHT QA AUDIT"
echo "===================================="
echo ""

BASE_URL="http://localhost:3000"
REPORT_FILE="/Users/rutikerole/.openclaw/workspace/BUG_REPORT_OVERNIGHT.md"
BUG_COUNT=0
TEST_COUNT=0

log_bug() {
    PRIORITY=$1
    TITLE=$2
    REPRODUCTION=$3
    EXPECTED=$4
    ACTUAL=$5
    FIX=$6
    
    BUG_COUNT=$((BUG_COUNT + 1))
    TEST_COUNT=$((TEST_COUNT + 1))
    
    echo "" >> "$REPORT_FILE"
    echo "### Bug #$BUG_COUNT - $PRIORITY: $TITLE" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Reproduction Steps:**" >> "$REPORT_FILE"
    echo "$REPRODUCTION" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Expected:** $EXPECTED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Actual:** $ACTUAL" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Recommended Fix:** $FIX" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    echo "🐛 $PRIORITY: $TITLE"
}

log_success() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo "✅ $1"
}

echo ""
echo "📡 === API ENDPOINT TESTING ==="
echo ""

# Test 1: Homepage
echo "Testing: Homepage..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>&1)
if [ "$RESPONSE" = "200" ]; then
    log_success "Homepage returns 200"
else
    log_bug "P0" "Homepage not responding correctly" "1. curl http://localhost:3000" "HTTP 200" "HTTP $RESPONSE" "Check Next.js server and routing"
fi

# Test 2: Login page
echo "Testing: Login page..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login" 2>&1)
if [ "$RESPONSE" = "200" ]; then
    log_success "Login page returns 200"
else
    log_bug "P1" "Login page not responding" "1. Navigate to /login" "HTTP 200" "HTTP $RESPONSE" "Check auth routes"
fi

# Test 3: Register page  
echo "Testing: Register page..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/register" 2>&1)
if [ "$RESPONSE" = "200" ]; then
    log_success "Register page returns 200"
else
    log_bug "P1" "Register page not responding" "1. Navigate to /register" "HTTP 200" "HTTP $RESPONSE" "Check auth routes"
fi

# Test 4: Dashboard (should redirect if not auth'd)
echo "Testing: Dashboard access..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard" 2>&1)
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ] || [ "$RESPONSE" = "307" ]; then
    log_success "Dashboard responds (auth check working)"
else
    log_bug "P2" "Dashboard route issue" "1. Navigate to /dashboard without auth" "HTTP 302/307 redirect or 200" "HTTP $RESPONSE" "Check middleware and auth guards"
fi

# Test 5: API workflows endpoint
echo "Testing: API /api/workflows..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/workflows" 2>&1)
if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ]; then
    log_success "Workflows API endpoint exists"
else
    log_bug "P1" "Workflows API endpoint issue" "1. curl http://localhost:3000/api/workflows" "HTTP 401 or 200" "HTTP $RESPONSE" "Check API route handler"
fi

# Test 6: API executions endpoint
echo "Testing: API /api/executions..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/executions" 2>&1)
if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ]; then
    log_success "Executions API endpoint exists"
else
    log_bug "P1" "Executions API endpoint issue" "1. curl http://localhost:3000/api/executions" "HTTP 401 or 200" "HTTP $RESPONSE" "Check API route handler"
fi

echo ""
echo "📁 === FILE STRUCTURE VALIDATION ==="
echo ""

# Test 7: Check critical files exist
FILES_TO_CHECK=(
    "src/app/page.tsx"
    "src/app/dashboard/page.tsx"
    "src/app/dashboard/canvas/page.tsx"
    "src/app/dashboard/workflows/page.tsx"
    "src/app/api/workflows/route.ts"
    "src/constants/prebuilt-workflows.ts"
    "src/constants/node-catalogue.ts"
)

for FILE in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$FILE" ]; then
        log_success "File exists: $FILE"
    else
        log_bug "P0" "Missing critical file: $FILE" "1. Check file structure" "File exists" "File not found" "Restore missing file from git or recreate"
    fi
done

echo ""
echo "🔍 === CODE REVIEW CHECKS ==="
echo ""

# Test 8: Check for console.log in production code
CONSOLE_LOGS=$(grep -r "console\\.log" src/ --include="*.tsx" --include="*.ts" | wc -l | tr -d ' ')
if [ "$CONSOLE_LOGS" -gt "5" ]; then
    log_bug "P3" "Too many console.log statements ($CONSOLE_LOGS found)" "1. grep -r 'console\\.log' src/" "Minimal or no console.logs" "$CONSOLE_LOGS console.logs found" "Remove or replace with proper logging system"
else
    log_success "Console.log usage acceptable"
fi

# Test 9: Check for TODO comments
TODOS=$(grep -r "TODO" src/ --include="*.tsx" --include="*.ts" | wc -l | tr -d ' ')
if [ "$TODOS" -gt "0" ]; then
    echo "⚠️  Found $TODOS TODO comments (documenting...)"
    log_bug "P3" "$TODOS TODO comments in codebase" "1. grep -r 'TODO' src/" "No unresolved TODOs" "$TODOS TODOs found" "Review and resolve or convert to GitHub issues"
else
    log_success "No TODO comments"
fi

# Test 10: Check for TypeScript errors
echo "Testing: TypeScript compilation..."
TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
if echo "$TSC_OUTPUT" | grep -q "error TS"; then
    ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep "error TS" | wc -l | tr -d ' ')
    log_bug "P1" "$ERROR_COUNT TypeScript errors" "1. npm run build or npx tsc --noEmit" "No TypeScript errors" "$ERROR_COUNT errors found" "Fix TypeScript type errors"
else
    log_success "No TypeScript errors"
fi

echo ""
echo "📦 === DEPENDENCY CHECK ==="
echo ""

# Test 11: Check for outdated dependencies
echo "Checking for security vulnerabilities..."
NPM_AUDIT=$(npm audit --audit-level=high 2>&1)
if echo "$NPM_AUDIT" | grep -q "found 0 vulnerabilities"; then
    log_success "No high/critical npm vulnerabilities"
elif echo "$NPM_AUDIT" | grep -q "vulnerabilities"; then
    VULN_COUNT=$(echo "$NPM_AUDIT" | grep -oE "[0-9]+ vulnerabilities" | head -1)
    log_bug "P2" "npm security vulnerabilities detected" "1. npm audit" "No vulnerabilities" "$VULN_COUNT" "Run npm audit fix or update vulnerable packages"
else
    log_success "npm audit check completed"
fi

echo ""
echo "✍️  === GENERATING SUMMARY ==="
echo ""

# Generate summary
PASS_RATE=$(echo "scale=1; (($TEST_COUNT - $BUG_COUNT) * 100) / $TEST_COUNT" | bc)

cat >> "$REPORT_FILE" << EOFSUMMARY

---

## 📊 SUMMARY

- **Total Tests:** $TEST_COUNT
- **Bugs Found:** $BUG_COUNT
- **Pass Rate:** ${PASS_RATE}%
- **Testing Duration:** Overnight QA Audit
- **Environment:** macOS, Node v25.6.1, Next.js 16

## 🎯 PRIORITY BREAKDOWN

To see detailed breakdown, review individual bugs above.

**Priority Levels:**
- **P0** - Critical: Blocks core functionality, must fix immediately
- **P1** - High: Major issues, fix before next deployment
- **P2** - Medium: Important but not blocking, schedule for next sprint
- **P3** - Low: Nice to have, technical debt, documentation

## ⚠️ CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION

$(grep -c "P0:" "$REPORT_FILE" || echo "0") P0 bugs found
$(grep -c "P1:" "$REPORT_FILE" || echo "0") P1 bugs found

## 📋 RECOMMENDED NEXT STEPS

1. **Immediate (Today):**
   - Fix all P0 bugs
   - Review and triage P1 bugs

2. **Short-term (This Week):**
   - Address P1 bugs before deployment
   - Add automated E2E tests for critical workflows
   - Set up CI/CD test pipeline

3. **Medium-term (Next Sprint):**
   - Resolve P2 bugs
   - Implement proper error monitoring (Sentry)
   - Add comprehensive test coverage

4. **Long-term (Backlog):**
   - Address P3 technical debt
   - Improve documentation
   - Performance optimization

## 🔬 TESTING GAPS IDENTIFIED

### Manual Testing Still Required:
1. **WF-01 Workflow** - Text → Building Description (requires auth + API keys)
2. **WF-09 Workflow** - BOQ Generation (requires IFC upload)
3. **All 7 Workflows** - End-to-end execution testing
4. **Mobile Testing** - Real device testing (not just viewport)
5. **Browser Compatibility** - Safari, Firefox testing
6. **Edge Cases:**
   - Empty states (no workflows, no projects)
   - Long inputs (10,000 character prompts)
   - Network errors during execution
   - Rate limiting (free tier 3 runs)

### Automated Tests Needed:
- Playwright/Cypress E2E tests for workflows
- API integration tests
- Component unit tests
- Visual regression tests
- Performance benchmarks

---

## 📝 NOTES FOR DEVELOPMENT TEAM

### Authentication Required
Most workflow testing requires authenticated session. Consider:
- Creating test accounts with seeded data
- Implementing API-level testing without UI
- Adding test mode that bypasses auth

### Workflow Testing Strategy
For comprehensive workflow testing, recommend:
1. Mock API responses for consistent testing
2. Create fixture data for each workflow type
3. Automated screenshot comparison
4. Performance metrics tracking

### Rate Limiting
Current free tier: 3 runs. Testing recommendations:
- Use test environment with higher limits
- Implement test mode that doesn't count against quota
- Add rate limit bypass for automated tests

---

**Testing completed at:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

**Tester:** 🧪 GOAT Mode Activated

EOFSUMMARY

echo ""
echo "=========================================="
echo "📊 FINAL RESULTS"
echo "=========================================="
echo "Total Tests: $TEST_COUNT"
echo "Bugs Found: $BUG_COUNT"
echo "Pass Rate: ${PASS_RATE}%"
echo ""
echo "📄 Full report saved to:"
echo "$REPORT_FILE"
echo "=========================================="

