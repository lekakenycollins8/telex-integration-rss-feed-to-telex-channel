const integrationSpecs = {
    data: {
      date: {
        created_at: "2025-02-18",
        updated_at: "2025-02-18"
      },
      descriptions: {
        app_name: "Webhook RSS Feed Integration",
        app_description: "Interval integration that fetches RSS feeds from TechCrunch, Wired, and Krebs on Security every 30 minutes and posts formatted updates via webhook to a Telex channel.",
        app_url: "https://example.com/webhook-rss-integration",
        app_logo: "https://media-hosting.imagekit.io//ed02bd5dbfcb4c7f/giddy.jpg?Expires=1831556093&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=yZzLY5rN~NSQaMRCsohy~tBswJrVgMAWJXc~6m9CFuHz7Gp6QIhYoFToleoWlr5WPu-12RyteB4zmjY9dzRsOhLTzp6uX96wsZ2FBP8N0ketouw2lOoVgBqDhP1ezfWh0Tiqabtx9Nj-GtDGHAOvKb-BqscrKLvhQOIMoFNfk~z4eXRV6-FSG2rS573mMZ4QKCfZamjTQVIQF7vegHVSwj2z0oS~JNnpCKqCY8XHXh7lhpG0tlqbuXrsCXFcKM0UpZBiqW9xz3FsliXOfvyw4TLSQzz65-UnqXZSZ-ZZHp3B9iQpmjGbIuNUwA0c~VqVGmyLPTC9c~IKzFB~m8OpOw__",
        background_color: "#123456"
      },
      integration_category: "Monitoring & Logging",
      integration_type: "interval",
      is_active: false,
      output: [
        {
          label: "output_channel_1",
          value: true
        },
        {
          label: "output_channel_2",
          value: false
        }
      ],
      key_features: [
        "Fetches and parses RSS feeds from multiple sources.",
        "Posts formatted updates to a Telex channel via webhook.",
        "Executes on a fixed interval using crontab syntax.",
        "Provides monitoring and logging capabilities."
      ],
      permissions: {
        monitoring_user: {
          always_online: true,
          display_name: "Performance Monitor"
        }
      },
      settings: [
        {
          label: "interval",
          type: "text",
          required: true,
          default: "*/30 * * * *",
          description: "Cron expression defining how often the integration runs."
        },
        {
          label: "Webhook URL",
          type: "text",
          required: true,
          default: "https://ping.telex.im/v1/webhooks/019513df-f990-7957-a978-b7601584d872",
          description: "URL to which webhook payloads are sent."
        },
        {
          label: "Feeds",
          type: "text",
          required: true,
          default: JSON.stringify([
            { url: "https://techcrunch.com/category/technology/feed/", category: "Tech" },
            { url: "https://www.wired.com/feed/category/business/latest/rss", category: "Business" },
            { url: "https://krebsonsecurity.com/feed/", category: "Cybersecurity" }
          ]),
          description: "JSON string of feed objects with their URLs and categories."
        },
        {
          label: "Event Name",
          type: "text",
          required: true,
          default: "rss_update",
          description: "Event name to be sent in the webhook payload."
        },
        {
          label: "Status",
          type: "text",
          required: true,
          default: "success",
          description: "Status indicator sent in the webhook payload."
        },
        {
          label: "Username",
          type: "text",
          required: true,
          default: "collins",
          description: "Username to be included in the webhook payload."
        }
      ],
      tick_url: "https://example.com/api/tick",
      target_url: ""
    }
  };
  
  module.exports = integrationSpecs;  