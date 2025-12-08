/**
 * Chat Service Unit Tests
 *
 * Tests for pure functions in chat service - no external API calls.
 */

import { generateSessionTitle } from '../../services/chat.service';

describe('Chat Service - Pure Functions', () => {
  describe('generateSessionTitle', () => {
    it('should generate title from short message', async () => {
      const title = await generateSessionTitle('Hello world');

      expect(title).toBe('Hello world');
    });

    it('should truncate long messages to first 6 words', async () => {
      const longMessage = 'This is a very long message that should be truncated for the title';
      const title = await generateSessionTitle(longMessage);

      const wordCount = title.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(6);
    });

    it('should return "New Chat" for empty message', async () => {
      const title = await generateSessionTitle('');

      expect(title).toBe('New Chat');
    });

    it('should handle single word messages', async () => {
      const title = await generateSessionTitle('Question');

      expect(title).toBe('Question');
    });

    it('should handle messages with extra whitespace', async () => {
      const title = await generateSessionTitle('  Hello   world  ');

      expect(title).toContain('Hello');
      expect(title).toContain('world');
    });

    it('should truncate title if it exceeds max length', async () => {
      // Create a message with very long words
      const longWordMessage = 'Supercalifragilisticexpialidocious Pneumonoultramicroscopicsilicovolcanoconiosis';
      const title = await generateSessionTitle(longWordMessage);

      expect(title.length).toBeLessThanOrEqual(103); // 100 max + "..."
    });
  });
});
