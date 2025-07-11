# WhatsApp Order Notification Setup Guide

This guide explains how to set up automatic WhatsApp notifications for new orders in your WooCommerce store.

## Overview

When a new order is placed on your WooCommerce store, the system will automatically send a WhatsApp message to the specified phone numbers with the order details.

## Configuration

The system is already configured to send notifications to:
- +90 549 260 80 80
- +49 178 3977612

If you need to change these numbers, edit the `NOTIFICATION_RECIPIENTS` list in the `order_notification.py` file.

## How It Works

The system uses two methods to detect new orders:

1. **WooCommerce Webhooks**: Instant notifications when an order is placed
2. **Periodic Checking**: A background task that checks for new orders every hour (as a backup)

## Setting Up WooCommerce Webhooks

To ensure immediate notifications when an order is placed, follow these steps to set up a webhook in WooCommerce:

1. Log in to your WordPress admin dashboard
2. Go to **WooCommerce** > **Settings** > **Advanced** > **Webhooks**
3. Click **Add webhook**
4. Configure the webhook:
   - **Name**: Order Notification Webhook
   - **Status**: Active
   - **Topic**: Order created
   - **Delivery URL**: `https://your-app-url.com/woocommerce-webhook`
   - **Secret**: (Leave empty or set a secret key)
   - **API Version**: v3

5. Click **Save webhook**

## Testing the Setup

You can test the notification system without creating a real order:

1. Visit the following URL in your browser:
   ```
   https://your-app-url.com/test-notification?token=whatsapptoken&order_id=123
   ```

2. Replace `123` with an actual order ID from your WooCommerce store
3. The system will send a test notification to the configured phone numbers

## Troubleshooting

If notifications aren't being sent:

1. Check that your WhatsApp Business API is properly configured
2. Verify that the META_ACCESS_TOKEN and META_PHONE_NUMBER_ID are correct in your .env file
3. Check the application logs for any error messages
4. Ensure the webhook URL is accessible from the internet
5. Try the test URL to manually trigger a notification

## Security Considerations

- The webhook endpoint is public but only processes valid WooCommerce order data
- The test endpoint requires the WEBHOOK_VERIFY_TOKEN for authentication
- Phone numbers are hardcoded in the application code for security 