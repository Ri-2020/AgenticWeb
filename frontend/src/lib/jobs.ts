import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Job, UserAccessStatus, UserAccessState } from "../types";

const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_CREATE_JOB_URL!;
const REQUEST_ACCESS_URL = process.env.NEXT_PUBLIC_REQUEST_ACCESS_URL!;

export class CloudFunctionError extends Error {
  status: number;
  code?: string;
  payload?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = "CloudFunctionError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function callCloudFunction<T>(idToken: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(CLOUD_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (payload.error as string) || "Request failed";
    const code = payload.code as string | undefined;
    throw new CloudFunctionError(message, res.status, code, payload);
  }

  return payload as T;
}

function docToJob(id: string, data: Record<string, unknown>): Job {
  return {
    id,
    userId: (data.userId as string) || "",
    agentType: (data.agentType as string) || "shopping",
    query: (data.query as string) || "",
    country: (data.country as string) || "",
    status: (data.status as Job["status"]) || "pending",
    results: (data.results as Record<string, unknown>) || null,
    error: (data.error as string) || null,
    currentStep: (data.currentStep as number) || 0,
    totalSteps: (data.totalSteps as number) || 0,
    stepMessage: (data.stepMessage as string) || "",
    steps: (data.steps as Job["steps"]) || [],
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() || new Date(),
  };
}

export async function createJob(
  idToken: string,
  agentType: string,
  userQuery: string,
  country: string,
): Promise<string> {
  const data = await callCloudFunction<{ jobId: string }>(idToken, {
    action: "create_job",
    agentType,
    query: userQuery,
    country,
  });
  return data.jobId;
}

export async function saveGeminiKey(idToken: string, apiKey: string): Promise<void> {
  await callCloudFunction(idToken, { action: "save_key", geminiApiKey: apiKey });
}

export async function getAccessStatus(idToken: string): Promise<UserAccessStatus> {
  const data = await callCloudFunction<Record<string, unknown>>(idToken, { action: "access_status" });
  const status = (data.status as UserAccessState) || "none";
  return {
    status,
    jobsToday: Number(data.jobsToday || 0),
    dailyLimit: Number(data.dailyLimit || 3),
    remainingToday: Number(data.remainingToday || 0),
    waitlistedAt: (data.waitlistedAt as string) || null,
    allowedAt: (data.allowedAt as string) || null,
    message: (data.message as string) || "",
  };
}

export async function joinWaitlist(idToken: string): Promise<void> {
  const res = await fetch(REQUEST_ACCESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (payload.error as string) || "Failed to join waitlist";
    throw new CloudFunctionError(message, res.status, payload.code as string | undefined, payload);
  }
}

export function listenToJob(jobId: string, callback: (job: Job | null) => void): Unsubscribe {
  const jobRef = doc(db, "jobs", jobId);
  return onSnapshot(
    jobRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(docToJob(snapshot.id, snapshot.data()));
    },
    (error) => {
      console.error("listenToJob failed:", error);
      callback(null);
    },
  );
}

export function listenToAgentJobs(
  userId: string,
  agentType: string,
  callback: (jobs: Job[]) => void,
  maxJobs = 20,
): Unsubscribe {
  const jobsRef = collection(db, "jobs");
  const q = query(
    jobsRef,
    where("userId", "==", userId),
    where("agentType", "==", agentType),
    orderBy("createdAt", "desc"),
    limit(maxJobs),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map((d) => docToJob(d.id, d.data()));
      callback(jobs);
    },
    (error) => {
      console.error("listenToAgentJobs failed:", error);
      callback([]);
    },
  );
}
