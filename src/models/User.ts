/**
 * RentIT User model
 * - Represents a real person
 * - One login per human
 * - No landlord/tenant/business logic here
 */

export interface User {
  _id?: string;

  name: string;
  email: string;
  tel?: string;

  hashedPassword?: string;

  emailVerified?: boolean;
  phoneVerified?: boolean;

  createdAt: Date;
  updatedAt?: Date;
}
