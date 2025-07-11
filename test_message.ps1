# Test WhatsApp Message Script

# Your credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
$phoneId = "725422520644608"  # Your registered phone number ID
$recipientPhone = "491522XXXXXXX"  # Replace with your actual recipient's phone number with country code

# Headers for all requests
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# Message body
$body = @{
  "messaging_product" = "whatsapp"
  "to" = $recipientPhone
  "type" = "text"
  "text" = @{
    "body" = "Hello! This is a test message from your WhatsApp bot."
  }
}

$jsonBody = $body | ConvertTo-Json

Write-Host "Sending test message to $recipientPhone..."
$uri = "https://graph.facebook.com/v18.0/$phoneId/messages"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $jsonBody -ErrorAction Stop
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