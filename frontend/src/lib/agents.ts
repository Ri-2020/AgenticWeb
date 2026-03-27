import { collection, onSnapshot, query, where, Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { AgentMeta } from "../types";

export function listenToAgents(callback: (agents: AgentMeta[]) => void): Unsubscribe {
  const agentsRef = collection(db, "agents");
  const q = query(agentsRef, where("status", "==", "active"));
  return onSnapshot(
    q,
    (snapshot) => {
      const agents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AgentMeta[];
      callback(agents);
    },
    (error) => {
      console.error("listenToAgents failed:", error);
      callback([]);
    },
  );
}
