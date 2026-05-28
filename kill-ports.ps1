$ports = @(3456, 2345, 8000, 5566)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $owningPids = $conns | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
        foreach ($owningPid in $owningPids) {
            Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
            Write-Host "[KILLED] PID $owningPid on port $port"
        }
    } else {
        Write-Host "[CLEAR]  Port $port -- no listener"
    }
}
Write-Host ""
Write-Host "All ports cleared. Safe to restart services."
