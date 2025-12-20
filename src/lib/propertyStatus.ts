import { PropertyStatus } from "@/models/Property";

export const PROPERTY_STATUS_TRANSITIONS: Record<
  PropertyStatus,
  PropertyStatus[]
> = {
  draft: ["listed", "withdrawn"],
  listed: ["paused", "under_offer", "withdrawn"],
  paused: ["listed", "withdrawn"],
  under_offer: ["offer_made", "listed"],
  offer_made: ["let", "listed"],
  let: ["ended", "breached"],
  ended: [],
  breached: [],
  withdrawn: [],
};

export function canTransition(
  from: PropertyStatus,
  to: PropertyStatus
): boolean {
  return PROPERTY_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
