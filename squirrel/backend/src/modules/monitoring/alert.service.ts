import { Injectable, Logger } from "@nestjs/common";

interface AlertData {
  statusCode: number | null;
  responseTime: number;
  region: string;
  error: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  async sendFailureAlert(monitor: any, data: AlertData) {
    this.logger.warn(`Alert: Monitor "${monitor.name}" failed`);
    this.logger.warn(
      `  Request: ${monitor.request.method} ${monitor.request.url}`,
    );
    this.logger.warn(`  Status: ${data.statusCode || "N/A"}`);
    this.logger.warn(`  Error: ${data.error}`);
    this.logger.warn(`  Region: ${data.region}`);
    this.logger.warn(`  Response Time: ${data.responseTime}ms`);

    // Get alert channels from monitor config
    const channels = monitor.alertChannels || {};

    // Send email alert
    if (channels.email) {
      await this.sendEmailAlert(channels.email, monitor, data);
    }

    // Send Slack alert
    if (channels.slack) {
      await this.sendSlackAlert(channels.slack, monitor, data);
    }

    // Send webhook alert
    if (channels.webhook) {
      await this.sendWebhookAlert(channels.webhook, monitor, data);
    }
  }

  private async sendEmailAlert(email: string, monitor: any, data: AlertData) {
    const endpoint = process.env.ALERT_EMAIL_WEBHOOK_URL;
    if (!endpoint) {
      this.logger.warn(
        `Email alerts are configured for ${email}, but ALERT_EMAIL_WEBHOOK_URL is not set. Skipping email delivery.`,
      );
      return;
    }

    const subject = `🚨 Monitor Alert: ${monitor.name} failed`;
    const text = [
      `Monitor: ${monitor.name}`,
      `Request: ${monitor.request.method} ${monitor.request.url}`,
      `Status: ${data.statusCode || "Connection Failed"}`,
      `Error: ${data.error}`,
      `Region: ${data.region}`,
      `Response Time: ${data.responseTime}ms`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join("\n");
    const html = `<h2>🚨 Monitor Failed: ${monitor.name}</h2>
<p><strong>Request:</strong> ${monitor.request.method} ${monitor.request.url}</p>
<p><strong>Status:</strong> ${data.statusCode || "Connection Failed"}</p>
<p><strong>Error:</strong> ${data.error}</p>
<p><strong>Region:</strong> ${data.region}</p>
<p><strong>Response Time:</strong> ${data.responseTime}ms</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (
        process.env.ALERT_EMAIL_WEBHOOK_AUTH_HEADER &&
        process.env.ALERT_EMAIL_WEBHOOK_AUTH_VALUE
      ) {
        headers[process.env.ALERT_EMAIL_WEBHOOK_AUTH_HEADER] =
          process.env.ALERT_EMAIL_WEBHOOK_AUTH_VALUE;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: email,
          subject,
          text,
          html,
          meta: {
            monitorId: monitor.id,
            monitorName: monitor.name,
            event: "monitor.failed",
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Email alert delivery failed with status ${response.status}: ${body}`,
        );
        return;
      }

      this.logger.log(`Email alert sent successfully to ${email}`);
    } catch (error) {
      this.logger.error("Failed to send email alert:", error);
    }
  }

  private async sendSlackAlert(
    webhookUrl: string,
    monitor: any,
    data: AlertData,
  ) {
    try {
      const message = {
        text: `🚨 Monitor Alert: ${monitor.name}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 Monitor Failed: ${monitor.name}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Request:*\n${monitor.request.method} ${monitor.request.url}`,
              },
              {
                type: "mrkdwn",
                text: `*Status:*\n${data.statusCode || "Connection Failed"}`,
              },
              {
                type: "mrkdwn",
                text: `*Response Time:*\n${data.responseTime}ms`,
              },
              {
                type: "mrkdwn",
                text: `*Region:*\n${data.region}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error:* ${data.error}`,
            },
          },
        ],
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      this.logger.log("Slack alert sent successfully");
    } catch (error) {
      this.logger.error("Failed to send Slack alert:", error);
    }
  }

  private async sendWebhookAlert(
    webhookUrl: string,
    monitor: any,
    data: AlertData,
  ) {
    try {
      const payload = {
        event: "monitor.failed",
        monitor: {
          id: monitor.id,
          name: monitor.name,
        },
        request: {
          method: monitor.request.method,
          url: monitor.request.url,
        },
        result: {
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          region: data.region,
          error: data.error,
        },
        timestamp: new Date().toISOString(),
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      this.logger.log("Webhook alert sent successfully");
    } catch (error) {
      this.logger.error("Failed to send webhook alert:", error);
    }
  }
}
