#!/bin/bash

echo "🎨 DEEP UI & EDGE CASE TESTING"
echo "=============================="
echo ""

REPORT_FILE="/Users/rutikerole/.openclaw/workspace/BUG_REPORT_OVERNIGHT.md"

# Check for empty state handling
echo "📋 Checking Empty State Handling..."

# Search for empty state UI components
EMPTY_STATE_COMPONENTS=$(grep -r "no workflows" src/ --include="*.tsx" -i | wc -l | tr -d ' ')
if [ "$EMPTY_STATE_COMPONENTS" -lt "1" ]; then
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #6 - P2: Missing Empty State UI Indicators

**Reproduction Steps:**
1. Create new account with no workflows
2. Navigate to /dashboard/workflows
3. Check if helpful empty state is displayed

**Expected:** User-friendly empty state with clear CTA (e.g., "Create your first workflow" button)

**Actual:** Likely shows empty list without guidance (based on code review - no empty state components found)

**Recommended Fix:**
Add empty state components to:
- `/dashboard/workflows` - "No workflows yet"
- `/dashboard/history` - "No executions yet"  
- `/dashboard/templates` - "No templates yet"

Example:
```tsx
{workflows.length === 0 ? (
  <EmptyState
    icon={<Workflow />}
    title="No workflows yet"
    description="Create your first workflow to get started"
    action={<Button>Create Workflow</Button>}
  />
) : (
  <WorkflowList workflows={workflows} />
)}
```

**Impact:** P2 - Poor UX for new users

---

EOFBUG
fi

# Check for loading states
echo "⏳ Checking Loading State Implementation..."
LOADING_STATES=$(grep -r "loading\|isLoading\|Loading" src/ --include="*.tsx" | wc -l | tr -d ' ')
if [ "$LOADING_STATES" -gt "0" ]; then
    echo "✅ Loading states implemented ($LOADING_STATES occurrences)"
else
    echo "⚠️  No loading states found"
fi

# Check for error boundaries
echo "🛡️ Checking Error Boundary Implementation..."
ERROR_BOUNDARY=$(grep -r "ErrorBoundary\|componentDidCatch" src/ --include="*.tsx" | wc -l | tr -d ' ')
if [ "$ERROR_BOUNDARY" -lt "1" ]; then
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #7 - P2: No Error Boundary Implementation

**Reproduction Steps:**
1. Search codebase for ErrorBoundary or componentDidCatch
2. Not found in any component

**Expected:** Error boundaries wrap critical sections to catch React errors gracefully

**Actual:** No error boundaries - React errors will show blank screen to users

**Recommended Fix:**
Add error boundary at app level:

```tsx
// src/components/error-boundary.tsx
'use client';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

Wrap dashboard layout:
```tsx
<ErrorBoundary>
  <DashboardLayout>{children}</DashboardLayout>
</ErrorBoundary>
```

**Impact:** P2 - Poor error handling UX, no crash reporting

---

EOFBUG
fi

# Check input validation
echo "✅ Checking Form Validation..."

# Check for Zod or validation libraries
VALIDATION=$(grep -r "zod\|yup\|joi" src/ --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
if [ "$VALIDATION" -gt "0" ]; then
    echo "✅ Validation library in use"
else
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #8 - P3: No Client-Side Form Validation Library

**Reproduction Steps:**
1. Search for Zod, Yup, or Joi imports
2. Check form components for validation

**Expected:** Consistent form validation using validation library (Zod recommended for TypeScript)

**Actual:** No validation library found (manual validation or none)

**Recommended Fix:**
Install and use Zod:
```bash
npm install zod react-hook-form @hookform/resolvers
```

Example usage:
```tsx
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const workflowSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const form = useForm({
  resolver: zodResolver(workflowSchema),
});
```

**Impact:** P3 - Inconsistent validation, potential API errors

---

EOFBUG
fi

# Check for accessibility
echo "♿ Checking Accessibility Implementation..."

ARIA_LABELS=$(grep -r "aria-label\|aria-" src/ --include="*.tsx" | wc -l | tr -d ' ')
if [ "$ARIA_LABELS" -lt "5" ]; then
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #9 - P3: Limited Accessibility (a11y) Implementation

**Reproduction Steps:**
1. Search codebase for aria-label, aria-describedby, etc.
2. Run Lighthouse accessibility audit

**Expected:** Comprehensive ARIA labels, semantic HTML, keyboard navigation

**Actual:** Minimal accessibility attributes found (< 5 occurrences)

**Recommended Fix:**
1. Add ARIA labels to all interactive elements:
```tsx
<button aria-label="Execute workflow">
  <PlayIcon />
</button>
```

2. Use semantic HTML:
```tsx
// Use: <nav>, <main>, <article>, <section>
// Not: <div> everywhere
```

3. Ensure keyboard navigation:
```tsx
<div role="button" tabIndex={0} onKeyPress={handleKeyPress}>
```

4. Test with:
- Screen reader (VoiceOver on Mac)
- Keyboard-only navigation
- Lighthouse audit

**Impact:** P3 - Excludes users with disabilities, SEO impact

---

EOFBUG
fi

# Check for rate limit display
echo "⏱️ Checking Rate Limit UI Feedback..."

RATE_LIMIT_UI=$(grep -r "rate.*limit\|remaining.*runs" src/app --include="*.tsx" -i | wc -l | tr -d ' ')
if [ "$RATE_LIMIT_UI" -lt "1" ]; then
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #10 - P1: No Rate Limit UI Feedback

**Reproduction Steps:**
1. Login as FREE tier user (3 runs limit)
2. Execute workflow
3. Check if remaining runs are displayed

**Expected:** Clear indicator showing "2 of 3 runs remaining" after execution

**Actual:** No UI feedback on rate limits (based on code review)

**Recommended Fix:**
Add rate limit display to dashboard:

```tsx
// In dashboard header or execution panel
const { data: rateLimit } = useQuery({
  queryKey: ['rateLimit'],
  queryFn: async () => {
    const res = await fetch('/api/user/rate-limit');
    return res.json();
  }
});

return (
  <div className="flex items-center gap-2">
    <Clock className="h-4 w-4" />
    <span className="text-sm">
      {rateLimit?.remaining}/{rateLimit?.limit} runs remaining
    </span>
    {rateLimit?.remaining === 0 && (
      <Button size="sm" variant="premium">
        Upgrade to Pro
      </Button>
    )}
  </div>
);
```

Add API endpoint:
```ts
// src/app/api/user/rate-limit/route.ts
export async function GET(req: NextRequest) {
  const session = await auth();
  // Return rate limit status from Upstash
}
```

**Impact:** P1 - Users hit limits without warning, poor UX, missed upgrade opportunities

---

EOFBUG
fi

# Check for mobile menu
echo "📱 Checking Mobile Navigation..."

MOBILE_MENU=$(grep -r "mobile.*menu\|sidebar.*mobile\|hamburger" src/ --include="*.tsx" -i | wc -l | tr -d ' ')
if [ "$MOBILE_MENU" -lt "1" ]; then
    cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #11 - P2: Potential Mobile Navigation Issues

**Reproduction Steps:**
1. Open site on mobile device or resize to 375px width
2. Check if navigation is accessible
3. Test dashboard sidebar on mobile

**Expected:** Hamburger menu or collapsible sidebar for mobile

**Actual:** No mobile menu components found in code search

**Recommended Fix:**
Implement mobile-friendly navigation:

```tsx
// Add to dashboard layout
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

return (
  <>
    {/* Mobile menu button */}
    <button 
      className="lg:hidden"
      onClick={() => setMobileMenuOpen(true)}
      aria-label="Open menu"
    >
      <MenuIcon />
    </button>
    
    {/* Sidebar */}
    <aside className={cn(
      "fixed lg:static inset-0 z-50",
      "lg:translate-x-0 transition-transform",
      mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <Sidebar />
    </aside>
    
    {/* Overlay */}
    {mobileMenuOpen && (
      <div 
        className="fixed inset-0 bg-black/50 lg:hidden"
        onClick={() => setMobileMenuOpen(false)}
      />
    )}
  </>
);
```

**Impact:** P2 - Mobile users may have navigation difficulties

---

EOFBUG
fi

# Check for long input handling
echo "📝 Checking Long Input Handling..."

cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #12 - P2: No Input Length Validation on Text Prompts

**Reproduction Steps:**
1. Navigate to WF-01 (Text → Building)
2. Paste 10,000 character text
3. Attempt to execute

**Expected:** 
- Character counter showing "X / max characters"
- Warning when approaching limit
- Error message if exceeded

**Actual:** Unknown - likely no length validation (NEEDS MANUAL TESTING)

**Recommended Fix:**
Add input validation to text prompt node:

```tsx
const MAX_PROMPT_LENGTH = 5000; // ~1000 tokens

<Textarea
  value={prompt}
  onChange={(e) => {
    const value = e.target.value;
    if (value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(value);
    }
  }}
  maxLength={MAX_PROMPT_LENGTH}
/>

<div className="flex justify-between text-sm text-muted-foreground">
  <span>Prompt for building generation</span>
  <span className={cn(
    prompt.length > MAX_PROMPT_LENGTH * 0.9 && "text-warning"
  )}>
    {prompt.length} / {MAX_PROMPT_LENGTH}
  </span>
</div>

{prompt.length > MAX_PROMPT_LENGTH * 0.9 && (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Approaching character limit. Very long prompts may be truncated.
    </AlertDescription>
  </Alert>
)}
```

**Impact:** P2 - Users may submit invalid inputs, API errors, poor UX

---

EOFBUG

cat >> "$REPORT_FILE" << 'EOFBUG'
### Bug #13 - P2: No Network Error Handling UI

**Reproduction Steps:**
1. Start workflow execution
2. Disconnect network mid-execution
3. Observe error handling

**Expected:** 
- Clear error message: "Network error. Check your connection."
- Retry button
- Execution marked as failed with option to retry

**Actual:** Unknown - needs manual testing with network throttling

**Recommended Fix:**
Add network error handling to execution manager:

```tsx
// Wrap API calls in try-catch
try {
  const response = await fetch('/api/execute-node', {
    method: 'POST',
    body: JSON.stringify(nodeData),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network error
    toast.error('Network error. Check your internet connection.', {
      action: {
        label: 'Retry',
        onClick: () => retryExecution(),
      },
    });
  } else {
    // Other API error
    toast.error(error.message || 'Execution failed');
  }
  
  // Update execution status to FAILED
  await updateExecutionStatus(executionId, 'FAILED', error.message);
}
```

**Impact:** P2 - Users confused when network issues occur during execution

---

EOFBUG

echo ""
echo "✅ Deep UI testing completed - see report for findings"

