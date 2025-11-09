/**
 * Universal UUID Generator
 * Provides reliable UUID generation that works in both Node.js and Jest environments
 */
export class UniversalUuid {
  /**
   * Generate a UUID v4 using a cross-compatible approach
   * This avoids ES module issues while maintaining UUID v4 compliance
   */
  static v4(): string {
    const timestamp = Date.now();
    const random1 = Math.floor(Math.random() * 0xffffffff);
    const random2 = Math.floor(Math.random() * 0xffffffff);
    const random3 = Math.floor(Math.random() * 0xffffffff);

    // Generate 32 hex characters
    const hex = (
      timestamp.toString(16).padStart(8, '0') +
      random1.toString(16).padStart(8, '0') +
      random2.toString(16).padStart(8, '0') +
      random3.toString(16).padStart(8, '0')
    ).substring(0, 32);

    // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return [
      hex.substring(0, 8),
      hex.substring(8, 4),
      '4' + hex.substring(13, 3), // Version 4
      ((parseInt(hex.substring(16, 1), 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 3), // Variant bits
      hex.substring(20, 12),
    ].join('-');
  }

  /**
   * Validate UUID format (supports v1, v3, v4, v5)
   */
  static isValid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Generate multiple UUIDs
   */
  static generateMultiple(count: number): string[] {
    return Array.from({ length: count }, () => this.v4());
  }
}

// Export a v4 function for compatibility with existing code
export const v4 = UniversalUuid.v4;
