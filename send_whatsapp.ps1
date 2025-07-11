# WhatsApp message sender script

$body = @{
  messaging_product = "whatsapp"
  to = "491783977612"
  type = "text"
  text = @{
    body = "Merhaba, DurmusBaba botuna hoş geldiniz!"
  }
} | ConvertTo-Json

# Make sure there are no angle brackets in the token
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"

$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

# Make sure there are no angle brackets in the phone ID
$phoneId = "725422520644608"
$uri = "https://graph.facebook.com/v18.0/$phoneId/messages"

Write-Host "Sending message to WhatsApp..."
Write-Host "API Endpoint: $uri"
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Message sent successfully!"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Error sending message:"
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)"
        
        # Try to get more details from the response
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody"
        }
        catch {
            Write-Host "Could not read response body: $($_.Exception.Message)"
        }
    }
    else {
        Write-Host "No response received from server"
    }
} 