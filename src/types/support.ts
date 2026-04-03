// ─── Support Chat System Types ──────────────────────────────────────────────

export type SupportStatus = "ACTIVE" | "ESCALATED" | "ADMIN_REPLIED" | "RESOLVED" | "CLOSED";
export type MessageRole = "USER" | "AI" | "ADMIN" | "SYSTEM";
export type SupportCategory =
  | "GENERAL"
  | "WORKFLOW_HELP"
  | "NODE_EXECUTION"
  | "BILLING"
  | "BUG_REPORT"
  | "FEATURE_REQUEST"
  | "IFC_PARSING"
  | "COST_ESTIMATION"
  | "THREE_D_GENERATION"
  | "ACCOUNT"
  | "TECHNICAL";

// ─── Message ────────────────────────────────────────────────────────────────

export interface SupportMessageMeta {
  model?: string;
  tokens?: number;
  latencyMs?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  suggestedCategory?: SupportCategory;
  suggestedSubject?: string;
  suggestions?: string[];
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: SupportMessageMeta;
  isInternal: boolean;
  createdAt: string;
}

// ─── Conversation ───────────────────────────────────────────────────────────

export interface SupportConversation {
  id: string;
  userId: string;
  status: SupportStatus;
  category: SupportCategory;
  subject: string | null;
  summary: string | null;
  priority: number;
  escalatedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  assignedTo: string | null;
  satisfaction: number | null;
  feedbackNote: string | null;
  pageContext: string | null;
  userPlan: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportConversationWithMessages extends SupportConversation {
  messages: SupportMessage[];
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
}

// ─── API Request/Response ───────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  conversationId?: string;
  pageContext?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: SupportMessage;
  suggestions: string[];
  category: SupportCategory;
}

export interface EscalationRequest {
  reason?: string;
}

export interface AdminReplyRequest {
  content: string;
  isInternal: boolean;
}

export interface ConversationRateRequest {
  rating: number;
  note?: string;
}

// ─── Admin Types ────────────────────────────────────────────────────────────

export interface AdminConversationFilters {
  status?: SupportStatus;
  category?: SupportCategory;
  priority?: number;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "priority" | "lastMessage";
}

export interface AdminConversationListItem {
  id: string;
  status: SupportStatus;
  category: SupportCategory;
  subject: string | null;
  summary: string | null;
  priority: number;
  escalatedAt: string | null;
  resolvedAt: string | null;
  assignedTo: string | null;
  satisfaction: number | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  lastMessagePreview: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
}

export interface AdminConversationDetail extends SupportConversationWithMessages {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    createdAt: string;
    _count: {
      workflows: number;
      executions: number;
    };
  };
}

export interface SupportAnalytics {
  totalConversations: number;
  escalationRate: number;
  aiResolutionRate: number;
  avgResolutionTimeHours: number;
  avgSatisfaction: number;
  avgMessagesPerConversation: number;
  topCategories: { category: SupportCategory; count: number }[];
  volumeByDay: { date: string; count: number }[];
  satisfactionDistribution: { rating: number; count: number }[];
  busiestHours: { hour: number; count: number }[];
  topFirstMessages: { message: string; count: number }[];
}

// ─── Widget State ───────────────────────────────────────────────────────────

export interface ChatWidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  activeConversationId: string | null;
  conversations: SupportConversation[];
  messages: Record<string, SupportMessage[]>;
  isLoading: boolean;
  isSending: boolean;
  suggestions: string[];
  unreadCount: number;
  pageContext: string;
  inputDraft: string;
}

// ─── Quick Reply ────────────────────────────────────────────────────────────

export interface SupportQuickReply {
  id: string;
  title: string;
  content: string;
  category: SupportCategory;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
