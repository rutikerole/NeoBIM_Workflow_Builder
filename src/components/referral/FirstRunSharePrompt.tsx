"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Gift, X } from "lucide-react";
import { toast } from "sonner";

const DISMISSED_KEY = "first_run_share_dismissed";

export default function FirstRunSharePrompt() {
  const [visible, setVisible] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchOrGenerateCode() {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === "true") return;

        const res = await fetch("/api/referral");
        if (!res.ok || cancelled) return;
        const data = await res.json();

        let code = data.code;

        if (!code) {
          const postRes = await fetch("/api/referral", { method: "POST" });
          if (!postRes.ok || cancelled) return;
          const postData = await postRes.json();
          code = postData.code;
        }

        if (code && !cancelled) {
          setReferralLink(`https://trybuildflow.in/register?ref=${code}`);
          setVisible(true);
        }
      } catch {
        // silently fail
      }
    }
    fetchOrGenerateCode();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
      window.gtag?.("event", "referral_link_copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <AnimatePresence>
      {visible && referralLink && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-4 right-4 left-4 z-50 sm:left-auto sm:w-[380px] rounded-xl border p-5 shadow-2xl"
          style={{
            background: "rgba(12,13,16,0.97)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-md p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Gift className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Great first run!
              </h4>
              <p className="text-xs text-white/50">
                Invite a colleague — you both get 1 bonus execution
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="flex-1 truncate text-xs text-white/60 font-mono">
              {referralLink}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
