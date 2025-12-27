// TenantPreQualification type for pre-qualification API
export interface TenantPreQualification {
	tenantId: string;
	applicationId: string;
	status: PreQualificationStatus;
	affordability: {
		monthlyIncome: number;
		rentAmount: number;
		incomeToRentRatio: number;
		employmentStatus: string;
	};
	selfDeclaredAdverseCredit: boolean;
	consentGiven: boolean;
	consentTimestamp: string;
	createdAt: string;
	updatedAt: string;
}



// Status for tenant pre-qualification evaluation

// Status for tenant pre-qualification evaluation
export enum PreQualificationStatus {
	PreQualified = 'PreQualified',
	RequiresReview = 'RequiresReview',
}


