/**
 * Normaliza teléfono al formato Meta Cloud API (solo dígitos, con código de país).
 * Ecuador: 0998386122 → 593998386122
 */
export function normalizePhone(phone: string): string {
    let digits: string = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
        digits = '593' + digits.slice(1);
    }
    return digits;
}