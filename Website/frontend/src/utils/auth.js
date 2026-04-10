const ALLOWED_UNIVERSITY_DOMAINS = ["cardiff.ac.uk"];

export function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

export function isAllowedUniversityEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);

  return ALLOWED_UNIVERSITY_DOMAINS.some((domain) =>
    normalizedEmail.endsWith(`@${domain}`)
  );
}

export { ALLOWED_UNIVERSITY_DOMAINS };
