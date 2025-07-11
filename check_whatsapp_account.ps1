# Check WhatsApp Business Account Information

# Your credentials
$token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"

# Headers for all requests
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Checking WhatsApp Business Account information..."

# Step 1: Get user/app information
Write-Host "`nStep 1: Getting user/app information..."
$meUri = "https://graph.facebook.com/v18.0/me"

try {
    $meResponse = Invoke-RestMethod -Method Get -Uri $meUri -Headers $headers -ErrorAction Stop
    Write-Host "User/App information:"
    $meResponse | ConvertTo-Json
}
catch {
    Write-Host "Failed to get user/app information:"
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

# Step 2: Get WhatsApp Business Accounts
Write-Host "`nStep 2: Getting WhatsApp Business Accounts..."
$wababUri = "https://graph.facebook.com/v18.0/me/businesses"

try {
    $wababResponse = Invoke-RestMethod -Method Get -Uri $wababUri -Headers $headers -ErrorAction Stop
    Write-Host "WhatsApp Business Accounts:"
    $wababResponse | ConvertTo-Json -Depth 3
    
    # Store the business ID if available
    $businessId = $null
    if ($wababResponse.data -and $wababResponse.data.Count -gt 0) {
        $businessId = $wababResponse.data[0].id
        Write-Host "Found Business ID: $businessId"
    }
}
catch {
    Write-Host "Failed to get WhatsApp Business Accounts:"
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

# Step 3: Get WhatsApp Phone Numbers if business ID is available
if ($businessId) {
    Write-Host "`nStep 3: Getting WhatsApp Phone Numbers..."
    $phoneNumbersUri = "https://graph.facebook.com/v18.0/$businessId/phone_numbers"
    
    try {
        $phoneNumbersResponse = Invoke-RestMethod -Method Get -Uri $phoneNumbersUri -Headers $headers -ErrorAction Stop
        Write-Host "WhatsApp Phone Numbers:"
        $phoneNumbersResponse | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "Failed to get WhatsApp Phone Numbers:"
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
}

# Step 4: Try to get all accounts directly
Write-Host "`nStep 4: Getting all accounts directly..."
$accountsUri = "https://graph.facebook.com/v18.0/me/accounts"

try {
    $accountsResponse = Invoke-RestMethod -Method Get -Uri $accountsUri -Headers $headers -ErrorAction Stop
    Write-Host "All accounts:"
    $accountsResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Failed to get all accounts:"
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

# Step 5: Try to get WhatsApp Business Cloud API phone numbers
Write-Host "`nStep 5: Getting WhatsApp Business Cloud API phone numbers..."
$cloudApiUri = "https://graph.facebook.com/v18.0/me/phone_numbers"

try {
    $cloudApiResponse = Invoke-RestMethod -Method Get -Uri $cloudApiUri -Headers $headers -ErrorAction Stop
    Write-Host "WhatsApp Business Cloud API phone numbers:"
    $cloudApiResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Failed to get WhatsApp Business Cloud API phone numbers:"
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