export type PresenceStateLike = Readonly<Record<string, readonly unknown[]>>;

export function countUniqueOnlineUsers(state: PresenceStateLike): number {
  return Object.values(state).filter((presences) => presences.length > 0).length;
}
