import pdfParse from "pdf-parse";
import mammoth from "mammoth";

// Simple utility to extract text from file buffers
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    switch (mimeType) {
      case "text/plain":
        return buffer.toString("utf-8");
      case "application/pdf": {
        const data = await pdfParse(buffer);
        return data.text || "";
      }
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
      }
      default:
        return "";
    }
  } catch (error) {
    console.error("Text extraction error:", error);
    return "";
  }
}
