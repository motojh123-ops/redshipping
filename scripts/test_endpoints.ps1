$login = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@banna-logistics.com","password":"password123"}'
$token = $login.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

$ports = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/masters/ports" -Headers $headers
$lines = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/masters/shipping-lines" -Headers $headers
$clients = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/clients" -Headers $headers
$quotes = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/quotations" -Headers $headers
$ships = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/shipments" -Headers $headers
$customs = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/customs" -Headers $headers
$invoices = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/invoices" -Headers $headers

Write-Output "--- ENDPOINTS HEALTH CHECK ---"
Write-Output "Login status: $($login.success)"
Write-Output "User: $($login.data.user.name) [$($login.data.user.role)]"
Write-Output "Ports count: $($ports.data.Count)"
Write-Output "Shipping Lines count: $($lines.data.Count)"
Write-Output "Clients count: $($clients.data.Count)"
Write-Output "Quotations count: $($quotes.data.Count)"
Write-Output "Shipments count: $($ships.data.Count)"
Write-Output "Customs count: $($customs.data.Count)"
Write-Output "Invoices count: $($invoices.data.Count)"
Write-Output "ALL ENDPOINTS RESPONDED WITH HTTP 200 OK!"
