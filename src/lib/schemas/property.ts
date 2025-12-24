import { z } from 'zod';

export const photoSchema = z.object({ url: z.string().url(), blobName: z.string() });

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  county: z.string().optional(),
  country: z.string().optional(),
});

export const createPropertySchema = z.object({
  title: z.string().min(1),
  headline: z.string().max(120).optional(),
  description: z.string().optional(),
  address: addressSchema,
  rentPcm: z.coerce.number().min(0),
  rentFrequency: z.enum(['pcm', 'pw']).optional().default('pcm'),
  // Allow updating status on properties (e.g., draft, listed, paused)
  status: z.enum(['draft','listed','paused','let','breached']).optional(),
  propertyType: z.enum(['flat', 'house', 'maisonette', 'studio', 'room', 'other']).optional().default('flat'),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  furnished: z.enum(['furnished', 'part-furnished', 'unfurnished', 'unknown']).optional().default('unknown'),
  deposit: z.coerce.number().min(0).optional(),
  availabilityDate: z.string().optional(),
  tenancyLengthMonths: z.coerce.number().int().min(0).optional(),
  billsIncluded: z.array(z.string()).optional().default([]),
  petsAllowed: z.boolean().optional().default(false),
  smokingAllowed: z.boolean().optional().default(false),
  epcRating: z.enum(['A','B','C','D','E','F','G','unknown']).optional(),
  councilTaxBand: z.enum(['A','B','C','D','E','F','G','H','unknown']).optional(),
  sizeSqm: z.coerce.number().min(0).optional(),
  parking: z.enum(['none','on-street','off-street','garage','driveway','permit','other']).optional().default('none'),
  amenities: z.array(z.string()).optional().default([]),
  virtualTourUrl: z.string().url().optional(),
  floor: z.string().optional(),
  hmoLicenseRequired: z.boolean().optional().default(false),
  viewingInstructions: z.string().optional(),
  photos: z.array(photoSchema).optional().default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
