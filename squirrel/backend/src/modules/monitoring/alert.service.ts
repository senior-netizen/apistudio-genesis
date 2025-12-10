import { Injectable, Logger } from '@nestjs/common';

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
        this.logger.warn(`  Request: ${monitor.request.method} ${monitor.request.url}`);
        this.logger.warn(`  Status: ${data.statusCode || 'N/A'}`);
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
        // TODO: Implement email sending (using nodemailer or similar)
        this.logger.log(`Would send email alert to: ${email}`);
        // Example:
        // await this.mailer.sendMail({
        //   to: email,
        //   subject: `Monitor Alert: ${monitor.name} failed`,
        //   html: this.buildEmailHtml(monitor, data),
        // });
    }

    private async sendSlackAlert(webhookUrl: string, monitor: any, data: AlertData) {
        try {
            const message = {
                text: `🚨 Monitor Alert: ${monitor.name}`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `🚨 Monitor Failed: ${monitor.name}`,
                        },
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Request:*\n${monitor.request.method} ${monitor.request.url}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Status:*\n${data.statusCode || 'Connection Failed'}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Response Time:*\n${data.responseTime}ms`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Region:*\n${data.region}`,
                            },
                        ],
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Error:* ${data.error}`,
                        },
                    },
                ],
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });

            this.logger.log('Slack alert sent successfully');
        } catch (error) {
            this.logger.error('Failed to send Slack alert:', error);
        }
    }

    private async sendWebhookAlert(webhookUrl: string, monitor: any, data: AlertData) {
        try {
            const payload = {
                event: 'monitor.failed',
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            this.logger.log('Webhook alert sent successfully');
        } catch (error) {
            this.logger.error('Failed to send webhook alert:', error);
        }
    }
}
