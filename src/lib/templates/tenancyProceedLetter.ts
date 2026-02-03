function formatEnGbDateOnly(d: Date): string {
  return d.toLocaleDateString("en-GB");
}

const DEFAULT_TEMPLATE = `Tenancy application – next steps

Date: {{DATE}}

Dear {{APPLICANT_NAME}},

Thank you for confirming that you wish to proceed with your tenancy application for {{PROPERTY_LABEL}}.

This letter confirms that we will now move your application to the next stage (Background Checks Agreement). You will receive separate instructions shortly.

If you have any questions, please reply to this email.

Kind regards,
RentIT`;

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    // Allow whitespace inside placeholder braces, e.g. {{ DATE }}
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }

  // Also support bracket placeholders used by some templates.
  if (vars.APPLICANT_NAME) out = out.replace(/\[\s*APPLICANT\s+NAME\s*\]/gi, vars.APPLICANT_NAME);
  if (vars.PROPERTY_LABEL) {
    out = out.replace(/\[\s*PROPERTY\s+ADDRESS\s*\]/gi, vars.PROPERTY_LABEL);
    out = out.replace(/\[\s*PROPERTY\s+LABEL\s*\]/gi, vars.PROPERTY_LABEL);
  }
  if (vars.DATE_TIME || vars.DATE) out = out.replace(/\[\s*DATE\s*\/\s*TIME\s*\]/gi, vars.DATE_TIME || vars.DATE);

  if (vars.LANDLORD_NAME) {
    out = out.replace(/\[\s*YOUR\s+NAME\s*\]/gi, vars.LANDLORD_NAME);
    out = out.replace(/\[\s*LANDLORD\s+NAME\s*\]/gi, vars.LANDLORD_NAME);
  }
  if (vars.LANDLORD_COMPANY) {
    out = out.replace(/\[\s*COMPANY\s*\/\s*BRAND\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
    out = out.replace(/\[\s*COMPANY\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
    out = out.replace(/\[\s*BRAND\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
  }
  if (vars.LANDLORD_PHONE) {
    out = out.replace(/\[\s*PHONE\s+NUMBER\s*\]/gi, vars.LANDLORD_PHONE);
    out = out.replace(/\[\s*PHONE\s*\]/gi, vars.LANDLORD_PHONE);
    out = out.replace(/\[\s*TEL\s*\]/gi, vars.LANDLORD_PHONE);
  }
  if (vars.LANDLORD_EMAIL) {
    out = out.replace(/\[\s*EMAIL\s+ADDRESS\s*\]/gi, vars.LANDLORD_EMAIL);
    out = out.replace(/\[\s*EMAIL\s*\]/gi, vars.LANDLORD_EMAIL);
  }

  return out;
}

export function seedTenancyProceedLetter(input: {
  applicantName: string;
  propertyLabel: string;
  now?: Date;
  templateOverride?: string | null;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  landlordCompany?: string;
}): { subject: string; content: string } {
  const now = input.now ?? new Date();

  const override = typeof input.templateOverride === "string" ? input.templateOverride.trim() : "";

  const template = override || DEFAULT_TEMPLATE;

  const content = applyTemplate(template, {
    DATE: formatEnGbDateOnly(now),
    APPLICANT_NAME: input.applicantName || "Applicant",
    PROPERTY_LABEL: input.propertyLabel || "the property",
    LANDLORD_NAME: input.landlordName || "",
    LANDLORD_EMAIL: input.landlordEmail || "",
    LANDLORD_PHONE: input.landlordPhone || "",
    LANDLORD_COMPANY: input.landlordCompany || "",
  });

  const subject = `Tenancy application – next steps`;

  return { subject, content };
}
