import { z } from "zod";

export const LandlordBackgroundCheckCriteriaSchema = z
  .object({
    credit: z
      .object({
        minExperianScore: z.number().int().min(0).max(9999),
        maxCcjs: z.number().int().min(0).max(99),
      })
      .strict(),

    references: z
      .object({
        requireEmployerVerification: z.boolean(),
        requireLandlordReference: z.boolean(),
      })
      .strict(),

    affordability: z
      .object({
        minIncomeMultiple: z.number().min(0).max(20).optional(),
        minMonthlyIncome: z.number().min(0).max(1_000_000).optional(),
      })
      .strict(),

    insurance: z
      .object({
        usesRentGuaranteeInsurance: z.boolean(),
        insurerName: z.string().trim().max(200).optional(),
      })
      .strict(),

    notes: z.string().trim().max(4000).optional(),
  })
  .strict();

export type LandlordBackgroundCheckCriteria = z.infer<
  typeof LandlordBackgroundCheckCriteriaSchema
>;

export const DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA: LandlordBackgroundCheckCriteria = {
  credit: {
    // Matches the current Stage 2 UI defaults.
    minExperianScore: 750,
    maxCcjs: 1,
  },
  references: {
    requireEmployerVerification: true,
    requireLandlordReference: true,
  },
  affordability: {
    minIncomeMultiple: 2.5,
  },
  insurance: {
    usesRentGuaranteeInsurance: false,
  },
};
