const RSSFetcher = require('../src/RSSFetcher');
const axios = require('axios');
const Parser = require('rss-parser');

// Mock axios and rss-parser
jest.mock('axios');
jest.mock('rss-parser');

describe('RSSFetcher', () => {
  let rssFetcher;
  const mockConfig = {
    feeds: [
      {
        url: 'https://techcrunch.com/feed/',
        category: 'Tech'
      }
    ],
    telexToken: 'mock-token',
    channelId: 'mock-channel'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    rssFetcher = new RSSFetcher(mockConfig);
  });

  describe('fetchFeeds', () => {
    it('should fetch and format feed items correctly', async () => {
      // Mock RSS parser response
      const mockFeedContent = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article',
            guid: '123'
          }
        ]
      };

      Parser.prototype.parseURL = jest.fn().mockResolvedValue(mockFeedContent);

      const result = await rssFetcher.fetchFeeds();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: 'Test Article',
        link: 'https://example.com/article',
        category: 'Tech',
        formattedMessage: '🚀 Tech: Test Article\n\n🔗 Read more: https://example.com/article'
      });
    });

    it('should handle feed fetch errors gracefully', async () => {
      Parser.prototype.parseURL = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await rssFetcher.fetchFeeds();

      expect(result).toHaveLength(0);
      expect(Parser.prototype.parseURL).toHaveBeenCalled();
    });

    it('should prevent duplicate posts', async () => {
      const mockFeedContent = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article',
            guid: '123'
          }
        ]
      };

      Parser.prototype.parseURL = jest.fn().mockResolvedValue(mockFeedContent);

      // First fetch
      const firstResult = await rssFetcher.fetchFeeds();
      expect(firstResult).toHaveLength(1);

      // Second fetch with same content
      const secondResult = await rssFetcher.fetchFeeds();
      expect(secondResult).toHaveLength(0);
    });
  });

  describe('sendToTelex', () => {
    it('should send message to Telex successfully', async () => {
      const mockMessage = '🚀 Tech: Test Article';
      const mockResponse = { success: true };

      axios.post.mockResolvedValue({ data: mockResponse });

      const result = await rssFetcher.sendToTelex(mockMessage);

      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalledWith(
        `https://api.telex.im/v1/channels/${mockConfig.channelId}/messages`,
        { text: mockMessage },
        {
          headers: {
            'Authorization': `Bearer ${mockConfig.telexToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle Telex API errors', async () => {
      const mockMessage = '🚀 Tech: Test Article';
      const mockError = new Error('API Error');
      mockError.response = { status: 500 };

      axios.post.mockRejectedValue(mockError);

      await expect(rssFetcher.sendToTelex(mockMessage)).rejects.toThrow();
    });
  });
});