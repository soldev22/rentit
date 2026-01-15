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
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function seedTenancyProceedLetter(input: {
  applicantName: string;
  propertyLabel: string;
  now?: Date;
  templateOverride?: string | null;
}): { subject: string; content: string } {
  const now = input.now ?? new Date();

  const override = typeof input.templateOverride === "string" ? input.templateOverride.trim() : "";

  const template = override || DEFAULT_TEMPLATE;

  const content = applyTemplate(template, {
    DATE: formatEnGbDateOnly(now),
    APPLICANT_NAME: input.applicantName || "Applicant",
    PROPERTY_LABEL: input.propertyLabel || "the property",
  });

  const subject = `Tenancy application – next steps`;

  return { subject, content };
}
