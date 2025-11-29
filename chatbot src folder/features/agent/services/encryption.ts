import crypto from "crypto";

export class encryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate a random salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString("hex");
  }

  /**
   * Derive encryption key from password and salt
   */
  private static deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, "sha256");
  }

  /**
   * Encrypt API key with salt
   */
  static encryptApiKey(apiKey: string, salt: string): string {
    try {
      // Use a combination of environment secret and salt for key derivation
      const masterKey = process.env.ENCRYPTION_SECRET || "default-secret-key";
      const key = this.deriveKey(masterKey, salt);

      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(apiKey, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag().toString("hex");

      // Combine IV, encrypted data, and auth tag
      return iv.toString("hex") + ":" + encrypted + ":" + authTag;
    } catch {
      throw new Error("Failed to encrypt API key");
    }
  }

  /**
   * Decrypt API key with salt
   */
  static decryptApiKey(encryptedApiKey: string, salt: string): string {
    try {
      const masterKey = process.env.ENCRYPTION_SECRET || "default-secret-key";
      const key = this.deriveKey(masterKey, salt);

      const parts = encryptedApiKey.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], "hex");

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch {
      throw new Error("Failed to decrypt API key");
    }
  }
}

export default encryption;
