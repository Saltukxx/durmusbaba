# WhatsApp Account Registration Script

# Your Meta credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
$phoneId = "725422520644608"

# User inputs with actual values
$countryCode = "49" # Germany country code
$phoneNumber = "15221581762" # Phone number without country code
$method = "sms" # Options: "sms" or "voice"
$certificateBase64 = "CmoKJgio2JGKsKvAAxIGZW50OndhIg1EVVJNVVNCQUJBLkRFUMmj9cIGGkAue7qWxaNwjhWPRTKm/fPscgxdUjV1oI1F5cqkAFlt7hwBEf6N46GY69eSPnNVcDpW+/+bVDbKgFrD52CdHZsCEjBtRQbH55fg6/Bas7aRrWgrl1vh7V3C9i9eBSK9TzrcXgtyFjcQzHfmtr2VNBSbpOE="
$pin = "123456" # Two-step verification PIN (required)

# API endpoint - using the Graph API endpoint
$uri = "https://graph.facebook.com/v18.0/$phoneId/register"

# Request body
$body = @{
    "messaging_product" = "whatsapp"
    "cc" = $countryCode
    "phone_number" = $phoneNumber
    "method" = $method
    "cert" = $certificateBase64
    "pin" = $pin
}

# Convert body to JSON
$jsonBody = $body | ConvertTo-Json

# Headers with authorization
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Registering WhatsApp account..."
Write-Host "Sending registration request to: $uri"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $jsonBody -ErrorAction Stop
    
    Write-Host "Registration request successful!"
    $response | ConvertTo-Json -Depth 10
    
    if ($response.account -and $response.account[0].vname) {
        Write-Host "Verified name from certificate: $($response.account[0].vname)"
        Write-Host "If this is correct, proceed with completing your account registration."
    }
}
catch {
    Write-Host "Registration request failed:"
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error message: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody"
        }
        catch {
            Write-Host "Could not read response body"
        }
    }
} 