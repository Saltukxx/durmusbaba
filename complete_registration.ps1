# WhatsApp Account Registration Completion Script

# User inputs with actual values
$countryCode = "49" # Germany country code
$phoneNumber = "15221581762" # Phone number without country code
$code = "VERIFICATION_CODE" # The code you received via SMS or voice call

# API endpoint
$uri = "https://graph.whatsapp.com/v1/account/verify"

# Request body
$body = @{
    "cc" = $countryCode
    "phone_number" = $phoneNumber
    "code" = $code
}

# Convert body to JSON
$jsonBody = $body | ConvertTo-Json

# Headers
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Completing WhatsApp account registration..."
Write-Host "Sending verification code to: $uri"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $jsonBody -ErrorAction Stop
    
    Write-Host "Registration completion successful!"
    $response | ConvertTo-Json -Depth 10
    
    Write-Host "Your WhatsApp account has been registered successfully."
    Write-Host "If you were re-registering your account, remember to restart the Coreapp."
}
catch {
    Write-Host "Registration completion failed:"
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