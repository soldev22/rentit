// src/lib/validation/property.schema.ts
import { z } from "zod";

/* =========================
   Enums
========================= */

export const FurnishedEnum = z.enum([
  "furnished",
  "part_furnished",
  "unfurnished",
  "unknown",
]);

export const PropertyTypeEnum = z.enum([
  "flat",
  "house",
  "studio",
  "bungalow",
  "maisonette",
]);

export const ParkingEnum = z.enum([
  "none",
  "permit",
  "garage",
  "driveway",
]);

export const EPCEnum = z.enum(["A", "B", "C", "D", "E", "F", "G"]);

export const CouncilTaxEnum = z.enum([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
]);

export const BillEnum = z.enum([
  "water",
  "gas",
  "electricity",
  "council_tax",
  "internet",
  "tv_license",
]);

export const AmenityEnum = z.enum([
  "garden",
  "balcony",
  "lift",
  "communal",
  "dishwasher",
  "washing_machine",
  "concierge",
]);

/* =========================
   Address
========================= */

const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  postcode: z.string().min(1),
});

/* =========================
   Property (Create Draft)
========================= */

export const CreatePropertySchema = z.object({
  landlordId: z.string().min(1), // validated against session server-side

  title: z.string().min(1).max(60),
  headline: z.string().min(1).max(120),
  description: z.string().min(1),

  address: AddressSchema,

  rentPcm: z.coerce.number().positive(),
  rentFrequency: z.literal("pcm"),
  currency: z.literal("GBP").default("GBP"),

  propertyType: PropertyTypeEnum,
  bedrooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),

  furnished: FurnishedEnum,

  deposit: z.coerce.number().min(0),

  availabilityDate: z.coerce.date(),

  tenancyLengthMonths: z.coerce.number().int().min(1),

  billsIncluded: z.array(BillEnum).default([]),

  petsAllowed: z.boolean().default(false),
  smokingAllowed: z.boolean().default(false),

  epcRating: EPCEnum,
  councilTaxBand: CouncilTaxEnum,

  sizeSqm: z.coerce.number().min(0),

  parking: ParkingEnum,

  amenities: z.array(AmenityEnum).default([]),

  virtualTourUrl: z.string().url().nullable().optional(),

  floor: z.coerce.number().int().min(0).optional(),

  hmoLicenseRequired: z.boolean().default(false),

  viewingInstructions: z.string().optional(),

}).strict();

/* =========================
   Types
========================= */

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
