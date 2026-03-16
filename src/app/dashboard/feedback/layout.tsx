import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beta Feedback",
  description: "Report bugs, request features, and share ideas for BuildFlow. Help us build the best AEC workflow tool.",
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
