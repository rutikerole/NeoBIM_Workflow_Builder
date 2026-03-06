#!/bin/bash
# DISTRIBUTION AGENT - COMPLETE EXECUTION SCRIPT

echo "🔥 DISTRIBUTION WAR MODE ACTIVATED"
echo "=================================="
echo ""

# Check dev server
echo "📡 Checking dev server..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Dev server running" || echo "❌ Dev server not running - start with 'npm run dev'"

echo ""
echo "📸 SCREENSHOT CAPTURE CHECKLIST:"
echo "--------------------------------"
echo "1. Landing Hero: http://localhost:3000"
echo "2. Pricing: http://localhost:3000 (scroll down)"
echo "3. Dashboard: http://localhost:3000/dashboard"
echo "4. Canvas: http://localhost:3000/dashboard/canvas"
echo "5. Billing: http://localhost:3000/dashboard/billing"
echo ""
echo "Tools: Use Cmd+Shift+4 (macOS) or Chrome DevTools screenshot"
echo "Save to: ./public/screenshots/"
echo ""

# Create screenshots directory
mkdir -p public/screenshots
echo "✅ Created ./public/screenshots/ directory"

echo ""
echo "📅 SOCIAL MEDIA POST SCHEDULE:"
echo "------------------------------"
echo "10:00 AM - Twitter Launch + LinkedIn Problem/Solution"
echo "12:00 PM - Indie Hackers Post"
echo "02:00 PM - LinkedIn Demo + Twitter Thread"
echo "03:00 PM - Reddit r/architecture"
echo "04:00 PM - Reddit r/SaaS"
echo "05:00 PM - Reddit r/Revit"
echo "06:00 PM - LinkedIn ROI + Twitter Comparison"
echo "10:00 PM - Twitter Day Recap"
echo ""

echo "📝 ALL CONTENT READY IN:"
echo "- SOCIAL_MEDIA_POSTS_DAY2.md (Twitter/LinkedIn/Reddit)"
echo "- MARKETING_EXECUTION_PLAN.md (Email templates)"
echo ""

echo "🚀 PRODUCT HUNT PREP:"
echo "--------------------"
echo "Launch: Friday March 7, 12:01 AM PST"
echo "Status: Draft ready in MARKETING_EXECUTION_PLAN.md"
echo ""

echo "✅ DISTRIBUTION AGENT READY"
echo "🔥 LAUNCH AT 8 AM SHARP"
