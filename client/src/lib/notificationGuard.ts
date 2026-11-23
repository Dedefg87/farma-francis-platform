export function shouldNotifyAgent(
  assignedTo: unknown,
  currentUserId: unknown
): boolean {
  if (assignedTo == null || assignedTo === "" || assignedTo === 0 || assignedTo === "0") {
    return true;
  }
  if (currentUserId == null) return false;
  return String(assignedTo) === String(currentUserId);
}

export function conversationOwner(conv: unknown): unknown {
  if (conv == null || typeof conv !== "object") return null;
  const c = conv as Record<string, unknown>;
  return c.assignedTo ?? c.assigned_to ?? c.assignedAgentId ?? c.assigned_agent_id ?? null;
}
