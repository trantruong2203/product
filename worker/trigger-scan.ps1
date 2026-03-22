$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZDUyYTdhMi00NWMzLTRjODAtYTJmNS1jZTQ0YTE0MzBkNTAiLCJlbWFpbCI6InRlc3QzQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc0MTYxMjQ1LCJleHAiOjE3NzQ3NjYwNDV9.fJ9kvL5fLdblMUybtHY5Wo9gDzj_AHiUXfgpq0x-PgM"
$body = @{
    prompt = "What is AI?"
    brand = "TestBrand"
    engines = @("ChatGPT")
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/geo/scan" -Method POST -ContentType "application/json" -Body $body -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
}
