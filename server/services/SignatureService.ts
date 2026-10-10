import crypto from 'node:crypto';

/**
 * Eagle Pay Signature Generation & Verification Service
 *
 * Algorithm specifications:
 * 1. Remove the 'sign' field.
 * 2. Remove empty string ("") and null/undefined values.
 * 3. Sort remaining parameter names in ASCII ascending order (alphabetic sort).
 * 4. Construct a raw string using key=value pairs joined with '&'.
 * 5. Do NOT URL-encode values.
 * 6. Append '&key=' + secretKey.
 * 7. Compute MD5 hash.
 * 8. Convert the hexadecimal digest to uppercase.
 */
export class SignatureService {
  /**
   * Generates the Eagle Pay signature for a parameters dictionary.
   */
  public static generateSignature(
    params: Record<string, unknown>,
    secretKey: string
  ): { signature: string; rawString: string } {
    if (!secretKey) {
      throw new Error('Signing failed: Secret key (mchKey) is required.');
    }

    // 1. Remove 'sign' and filter out null, undefined, or empty strings
    const filteredEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(params)) {
      if (key === 'sign') continue;
      if (value === null || value === undefined || value === '') continue;

      // Convert value strictly to string without trimming numeric precision
      filteredEntries.push([key, String(value)]);
    }

    // 2. Sort parameter names in ASCII ascending order
    filteredEntries.sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0));

    // 3. Construct raw string using key=value pairs joined with &
    // Do NOT URL encode
    const queryString = filteredEntries
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    // 4. Append &key=THE_SECRET
    const rawString = `${queryString}&key=${secretKey}`;

    // 5. Compute MD5 in uppercase
    const signature = crypto
      .createHash('md5')
      .update(rawString, 'utf8')
      .digest('hex')
      .toUpperCase();

    return { signature, rawString };
  }

  /**
   * Verifies an incoming webhook or callback signature.
   */
  public static verifySignature(
    params: Record<string, unknown>,
    receivedSign: string | undefined,
    secretKey: string
  ): { isValid: boolean; calculatedSign: string; rawString: string } {
    if (!receivedSign) {
      return { isValid: false, calculatedSign: '', rawString: '' };
    }

    const { signature: calculatedSign, rawString } = this.generateSignature(params, secretKey);

    // Constant-time comparison to prevent timing attacks
    const isValid = this.safeCompare(receivedSign.toUpperCase(), calculatedSign);

    return { isValid, calculatedSign, rawString };
  }

  /**
   * Constant-time string comparison
   */
  private static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
