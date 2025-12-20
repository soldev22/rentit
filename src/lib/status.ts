export const USER_STATUSES = ["ACTIVE", "PAUSED"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export function isUserStatus(value: unknown): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus);
}
