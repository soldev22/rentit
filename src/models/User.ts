/**
 * RentIT User model
 * - Represents a real person
 * - One login per human
 * - No landlord/tenant/business logic here
 */

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: "applicant" | "tenant" | "landlord" | "agent" | "tradesperson" | "admin";
  phone?: string;
  address?: Address;
  addressVerified: boolean;
  profileCompleteness: number;
}
export function calculateProfileCompleteness(user: Partial<User>) {
  let score = 0;

  if (user.name && user.email) score += 40;
  if (user.phone) score += 30;
  if (user.address?.line1 && user.address?.postcode) score += 30;

  return score;
}

