/**
 * Normalizes a phone number byRemoving all non-numeric characters.
 * Optionally keeps the '+' prefix if it's there.
 */
export function normalizePhone(phone: string): string {
    if (!phone) return "";
    // Remove all non-digits, but keep '+' if it's at the start
    const digitsOnly = phone.replace(/\D/g, "");

    // For many Indian users, we handle the 91 code or its absence.
    // However, for consistency, let's just use the digits.
    // E.164 usually looks like +917471180076.
    // If the user inputs 7471180076, we want them to match.

    // Common pattern: if it's 10 digits, it's likely a local number.
    // If it's 12 digits starting with 91, it's an Indian number.

    // If it's a 10 digit number (standard local), prepend +91
    if (digitsOnly.length === 10) {
        return `+91${digitsOnly}`;
    }

    // Handle 11 digits starting with 0 (e.g. 07471180076 -> +917471180076)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
        return `+91${digitsOnly.substring(1)}`;
    }

    // If it's exactly 12 digits and starts with 91, prepend the +
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        return `+${digitsOnly}`;
    }

    // If it already has the + but we stripped it, or it's an international code
    // Assuming user might input random formats, we'll prefix '+' as a fallback
    if (digitsOnly.length >= 10) {
        return `+${digitsOnly.replace(/^0+/, "")}`;
    }

    return digitsOnly;
}

/**
 * Compare two phone numbers for equality using normalization
 */
export function isSamePhone(p1: string, p2: string): boolean {
    return normalizePhone(p1) === normalizePhone(p2);
}
