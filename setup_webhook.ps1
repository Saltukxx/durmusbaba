# WhatsApp API Webhook Setup Script

# Your credentials
$token = "EAA3oBtMMm1MBO2niZA7bevRovOyIS479wXtOg0C9pWztSvnPHJIuWpsrO6fCvB6DGcDH5LMZCqaMwGSmpXJIMPlNZCSZBbjmp7gOGZBl8iZBpMSzS6B1NgfBtwU2cVJBGOrARd9VF5VpQpi7vW5itTOPyUZCPgiXwXYZClX5O6q44kCd7zvw8hrGRzyltfiOhykywvqFsimKXdB4uFFUEt49UaZBSp6bkHEw7stAeUKIF"
$phoneId = "725422520644608"  # Your newly registered phone number ID
$webhookUrl = "https://durmusbaba-bot-d4e8f2c6c5c0.herokuapp.com/webhook"  # Your actual webhook URL
$verifyToken = "whatsapptoken"  # This should match the VERIFY_TOKEN in your main.py

# Headers for all requests
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Setting up WhatsApp webhook for phone number ID: $phoneId"

# First, subscribe the app to the business account
$businessAccountId = "1525421081598683"  # Business account ID
$subscribeUri = "https://graph.facebook.com/v18.0/$businessAccountId/subscribed_apps"

try {
    $subscribeResponse = Invoke-RestMethod -Method Post -Uri $subscribeUri -Headers $headers -ErrorAction Stop
    Write-Host "App subscription successful!"
    $subscribeResponse | ConvertTo-Json
}
catch {
    Write-Host "App subscription failed:"
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody"
        }
        catch {
            Write-Host "Could not read response body"
        }
    }
    exit
}

Write-Host ""

# Now, set up the webhook
$webhookSetupUri = "https://graph.facebook.com/v18.0/app/subscriptions"

$body = @{
    "object" = "whatsapp_business_account"
    "callback_url" = $webhookUrl
    "verify_token" = $verifyToken
    "fields" = @("messages", "message_deliveries", "messaging_postbacks", "message_reads")
}

$jsonBody = $body | ConvertTo-Json

try {
    $webhookResponse = Invoke-RestMethod -Method Post -Uri $webhookSetupUri -Headers $headers -Body $jsonBody -ErrorAction Stop
    Write-Host "Webhook setup successful!"
    $webhookResponse | ConvertTo-Json
}
catch {
    Write-Host "Webhook setup failed:"
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody"
        }
        catch {
            Write-Host "Could not read response body"
        }
    }
}

Write-Host ""
Write-Host "Webhook setup process completed. If successful, your webhook should now be configured."
Write-Host "Make sure your server is running and accessible at the webhook URL: $webhookUrl" 