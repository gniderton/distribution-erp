$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    items = @(
        @{
            id = "23"
            type = "payment"
            action = "Verified"
            reason = "Test from PowerShell"
        }
    )
    action = $null
    reason = $null
    user_id = 2118977
} | ConvertTo-Json -Depth 10

Write-Host "Sending request to Render..."
Write-Host "Body: $body"

$response = Invoke-RestMethod -Uri "https://distribution-erp.onrender.com/api/finance/reconciliation/bulk-update" -Method POST -Headers $headers -Body $body

Write-Host "`nResponse:"
$response | ConvertTo-Json -Depth 10
