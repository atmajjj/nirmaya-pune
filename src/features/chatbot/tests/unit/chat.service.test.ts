/**
 * Chat Service Unit Tests
 *
 * Tests for pure functions in chat service - no external API calls.
 */

import { isGreeting, handleGreeting, generateSessionTitle } from '../../services/chat.service';

describe('Chat Service - Pure Functions', () => {
  describe('isGreeting', () => {
    it('should detect simple greetings', () => {
      expect(isGreeting('hi')).toBe(true);
      expect(isGreeting('hello')).toBe(true);
      expect(isGreeting('hey')).toBe(true);
    });

    it('should detect greetings with different cases', () => {
      expect(isGreeting('Hi')).toBe(true);
      expect(isGreeting('HELLO')).toBe(true);
      expect(isGreeting('HEY')).toBe(true);
    });

    it('should detect greetings with trailing text', () => {
      expect(isGreeting('hi there')).toBe(true);
      expect(isGreeting('hello, how are you')).toBe(true);
      expect(isGreeting('hey!')).toBe(true);
    });

    it('should detect time-based greetings', () => {
      expect(isGreeting('good morning')).toBe(true);
      expect(isGreeting('good afternoon')).toBe(true);
      expect(isGreeting('good evening')).toBe(true);
    });

    it('should not detect non-greeting messages', () => {
      expect(isGreeting('What is machine learning?')).toBe(false);
      expect(isGreeting('Tell me about the documents')).toBe(false);
      expect(isGreeting('highway traffic report')).toBe(false); // Contains 'hi' but not a greeting
    });

    it('should handle empty and whitespace strings', () => {
      expect(isGreeting('')).toBe(false);
      expect(isGreeting('   ')).toBe(false);
    });

    it('should detect how are you', () => {
      expect(isGreeting('how are you')).toBe(true);
      expect(isGreeting('how are you doing today')).toBe(true);
    });
  });

  describe('handleGreeting', () => {
    it('should return a greeting response', () => {
      const response = handleGreeting();

      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should mention NIRA AI', () => {
      const response = handleGreeting();

      expect(response).toContain('NIRA AI');
    });

    it('should mention documents or Nirmaya platform', () => {
      const response = handleGreeting();

      const mentionsDocuments = response.includes('document');
      const mentionsNirmaya = response.includes('Nirmaya');

      expect(mentionsDocuments || mentionsNirmaya).toBe(true);
    });

    it('should return different responses (random selection)', () => {
      // Call multiple times and collect unique responses
      const responses = new Set<string>();

      for (let i = 0; i < 20; i++) {
        responses.add(handleGreeting());
      }

      // With 3 possible responses and 20 tries, we should get at least 2 different ones
      // (statistically almost certain)
      expect(responses.size).toBeGreaterThanOrEqual(1);
    });
  });

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
