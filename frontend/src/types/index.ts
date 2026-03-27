// ── Agent Registry ──

export interface InputField {
  name: string;
  label: string;
  type: "text" | "select";
  placeholder?: string;
  options?: string[];
  default?: string;
  required?: boolean;
}

export interface StepStatus {
  name: string;
  status: "pending" | "in_progress" | "completed";
}

export interface AgentMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "active" | "inactive";
  outputType: string;
  inputFields: InputField[];
  steps: string[];
}

// ── Products (shopping agent output) ──

export interface ProductRecommendation {
  product_name: string;
  price: string;
  url: string;
  reason: string;
}

export interface CategoryRecommendation {
  category: string;
  best_match: ProductRecommendation;
  alternatives: ProductRecommendation[];
}

export interface ShoppingRecommendations {
  recommendations: CategoryRecommendation[];
}

// ── Jobs ──

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  userId: string;
  agentType: string;
  query: string;
  country: string;
  status: JobStatus;
  results: Record<string, unknown> | null;
  error: string | null;
  currentStep: number;
  totalSteps: number;
  stepMessage: string;
  steps: StepStatus[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Access Control / Quota ──

export type UserAccessState = "allowed" | "waitlisted" | "blocked";

export interface UserAccessStatus {
  status: UserAccessState;
  jobsToday: number;
  dailyLimit: number;
  remainingToday: number;
  waitlistedAt: string | null;
  allowedAt: string | null;
  message: string;
}
