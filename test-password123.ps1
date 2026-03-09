$body = '{"email":"testuser@test.com","password":"password123"}'
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5173/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
    Write-Output "Status: $($response.StatusCode)"
    Write-Output "Response: $($response.Content)"
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    Write-Output "Response: $($_.Exception.Response)"
}
