# WhatsApp API verification script

# Your credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
$phoneId = "725422520644608"

# Headers for all requests
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "WhatsApp Business API Verification Script"
Write-Host "======================================="
Write-Host ""

# Step 1: Verify token by getting business account info
Write-Host "Step 1: Verifying token by getting business account info..."
$businessInfoUri = "https://graph.facebook.com/v18.0/me/businesses"

try {
    $businessResponse = Invoke-RestMethod -Method Get -Uri $businessInfoUri -Headers $headers -ErrorAction Stop
    Write-Host "Token is valid. Business account info retrieved:"
    $businessResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Token verification failed:"
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
    
    Write-Host "Please verify your token is correct and has the necessary permissions."
    exit
}

Write-Host ""

# Step 2: Verify phone number ID
Write-Host "Step 2: Verifying phone number ID..."
$phoneInfoUri = "https://graph.facebook.com/v18.0/$phoneId"

try {
    $phoneResponse = Invoke-RestMethod -Method Get -Uri $phoneInfoUri -Headers $headers -ErrorAction Stop
    Write-Host "Phone ID is valid. Phone info retrieved:"
    $phoneResponse | ConvertTo-Json
}
catch {
    Write-Host "Phone ID verification failed:"
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
    
    Write-Host "Please verify your phone number ID is correct."
    exit
} 