# WhatsApp API message sending script

# Your credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
$phoneId = "725422520644608"
$recipientNumber = "491783977612"  # Make sure this is the correct format without "+" prefix

# Message content
$body = @{
  messaging_product = "whatsapp"
  to = $recipientNumber
  type = "text"
  text = @{
    body = "Merhaba, DurmusBaba destek hattına bağlandınız!"
  }
} | ConvertTo-Json

# Headers for request
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Sending WhatsApp message..."
$uri = "https://graph.facebook.com/v18.0/$phoneId/messages"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Message sent successfully!"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Message sending failed:"
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