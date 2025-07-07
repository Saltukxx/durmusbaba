# WhatsApp API app registration script

# Your credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
$phoneId = "670086282856954"

# Headers for all requests
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Registering app with WhatsApp API..."
$uri = "https://graph.facebook.com/v18.0/$phoneId/subscribed_apps"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ErrorAction Stop
    Write-Host "App registration successful!"
    $response | ConvertTo-Json
}
catch {
    Write-Host "App registration failed:"
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