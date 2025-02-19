const { WebhookRSSFetcher, WebhookRSSIntegration } = require('../src/WebhookRSSIntegration');
const axios = require('axios');
const Parser = require('rss-parser');

// Mock dependencies
jest.mock('axios');
jest.mock('rss-parser');

describe('WebhookRSSFetcher', () => {
  let fetcher;
  const mockConfig = {
    webhookUrl: 'https://test-webhook.com',
    feeds: [
      {
        url: 'https://test.com/feed',
        category: 'Tech'
      }
    ]
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    Parser.mockClear();
    axios.post.mockClear();
  });

  describe('Constructor', () => {
    test('should create instance with valid config', () => {
      fetcher = new WebhookRSSFetcher(mockConfig);
      expect(fetcher.webhookUrl).toBe(mockConfig.webhookUrl);
      expect(fetcher.feeds).toEqual(mockConfig.feeds);
    });

    test('should throw error if webhookUrl is missing', () => {
      expect(() => new WebhookRSSFetcher({ feeds: [] }))
        .toThrow('Missing required configuration: webhookUrl is required');
    });

    test('should throw error if feeds is not an array', () => {
      expect(() => new WebhookRSSFetcher({ webhookUrl: 'test', feeds: 'invalid' }))
        .toThrow('Feeds must be an array');
    });

    test('should throw error if feed is missing required properties', () => {
      const invalidConfig = {
        webhookUrl: 'test',
        feeds: [{ url: 'https://test.com' }] // missing category
      };
      expect(() => new WebhookRSSFetcher(invalidConfig))
        .toThrow('Invalid feed at index 0: must have url and category');
    });

    test('should throw error if feed URL is invalid', () => {
      const invalidConfig = {
        webhookUrl: 'test',
        feeds: [{ url: 'invalid-url', category: 'Tech' }]
      };
      expect(() => new WebhookRSSFetcher(invalidConfig))
        .toThrow('Invalid feed URL at index 0: invalid-url');
    });
  });

  describe('fetchFeeds', () => {
    beforeEach(() => {
      fetcher = new WebhookRSSFetcher(mockConfig);
    });

    test('should fetch and format feeds successfully', async () => {
      const mockFeedContent = {
        items: [
          {
            title: 'Test Article',
            link: 'https://test.com/article',
            guid: '123'
          }
        ]
      };

      Parser.prototype.parseURL = jest.fn().mockResolvedValue(mockFeedContent);

      const results = await fetcher.fetchFeeds();
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: 'Test Article',
        link: 'https://test.com/article',
        category: 'Tech'
      });
    });

    test('should handle empty feeds array', async () => {
      fetcher.feeds = [];
      const results = await fetcher.fetchFeeds();
      expect(results).toHaveLength(0);
    });

    test('should handle feed fetch errors', async () => {
      Parser.prototype.parseURL = jest.fn().mockRejectedValue(new Error('Feed fetch failed'));
      
      const results = await fetcher.fetchFeeds();
      expect(results).toHaveLength(0);
    });
  });

  describe('sendToWebhook', () => {
    beforeEach(() => {
      fetcher = new WebhookRSSFetcher(mockConfig);
    });

    test('should send message to webhook successfully', async () => {
      const mockResponse = { data: 'success', status: 200 };
      axios.post.mockResolvedValue(mockResponse);

      const message = 'Test message';
      const result = await fetcher.sendToWebhook(message);
      
      expect(axios.post).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          message,
          event_name: 'rss_update',
          status: 'success'
        }),
        expect.any(Object)
      );
      expect(result).toBe('success');
    });

    test('should throw error for invalid message', async () => {
      await expect(fetcher.sendToWebhook('')).rejects.toThrow('Invalid message format');
      await expect(fetcher.sendToWebhook(null)).rejects.toThrow('Invalid message format');
    });

    test('should handle webhook errors', async () => {
      axios.post.mockRejectedValue(new Error('Webhook failed'));
      
      await expect(fetcher.sendToWebhook('Test message')).rejects.toThrow('Webhook failed');
    });
  });

  describe('formatFeedItem', () => {
    beforeEach(() => {
      fetcher = new WebhookRSSFetcher(mockConfig);
    });

    test('should format feed item correctly', () => {
      const item = {
        title: 'Test Article',
        link: 'https://test.com/article'
      };
      
      const result = fetcher.formatFeedItem(item, 'Tech');
      
      expect(result.title).toBe('Test Article');
      expect(result.link).toBe('https://test.com/article');
      expect(result.category).toBe('Tech');
      expect(result.formattedMessage).toContain('👨‍💻 Tech: Test Article');
      expect(result.formattedMessage).toContain('🔗 Read more: https://test.com/article');
    });

    test('should clean special characters from title', () => {
      const item = {
        title: 'Test "Article" with 'special' characters—and more',
        link: 'https://test.com/article'
      };
      
      const result = fetcher.formatFeedItem(item, 'Tech');
      
      expect(result.title).toBe('Test "Article" with \'special\' characters-and more');
    });

    test('should truncate long messages', () => {
      const item = {
        title: 'A'.repeat(4000),
        link: 'https://test.com/article'
      };
      
      const result = fetcher.formatFeedItem(item, 'Tech');
      
      expect(result.formattedMessage.length).toBeLessThanOrEqual(4000);
      expect(result.formattedMessage).toMatch(/\.\.\.$/);
    });
  });
});

describe('WebhookRSSIntegration', () => {
  let integration;
  
  beforeEach(() => {
    jest.useFakeTimers();
    integration = new WebhookRSSIntegration();
  });

  afterEach(() => {
    jest.useRealTimers();
    integration.stop();
  });

  test('should start and stop correctly', async () => {
    // Mock the fetchAndSend method
    integration.fetchAndSend = jest.fn();
    
    await integration.start();
    
    expect(integration.fetchAndSend).toHaveBeenCalledTimes(1);
    expect(integration.interval).toBeTruthy();
    
    integration.stop();
    
    expect(integration.interval).toBeNull();
  });

  test('should handle errors in fetchAndSend', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    integration.rssFetcher.fetchFeeds = jest.fn().mockRejectedValue(new Error('Fetch failed'));
    
    await integration.fetchAndSend();
    
    expect(consoleSpy).toHaveBeenCalledWith('Error in fetch and send cycle:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});