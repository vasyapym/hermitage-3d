# tools/lane-quiet-wait.ps1 — the office-lane quiet gate (sq-arch-day, 2026-11-24): polls the
# agent-jobs BOARD until both OTHER lanes are idle and the open queue (minus the paused-heavy
# placeholder) is empty, then returns 0; returns 3 at the deadline. Static content only: no
# Invoke-Expression, no dynamic code — the endpoint's PowerShell heuristic blocks iex loops,
# and a lane's jobs must stay AV-clean. The caller passes its own lane (%LANE%): a lane that
# is running THIS wait is not «busy».
param([string]$lane = 'a1')
$deadline = (Get-Date).AddMinutes(185)
$board = 'C:\Users\v.argunov\agent-runner\agent-jobs\jobs\BOARD.md'
$openDir = 'C:\Users\v.argunov\agent-runner\agent-jobs\jobs\open'
while ((Get-Date) -lt $deadline) {
  git -C 'C:\Users\v.argunov\agent-runner\agent-jobs' pull -q 2>$null
  $busy = @(Select-String -Path $board -Pattern '\| running' | Where-Object { $_.Line -notmatch ('^' + $lane + ' \| running') })
  $queued = @(Get-ChildItem $openDir -Filter *.md | Where-Object { $_.Name -ne 'gate4-heavy-2.md' }).Count
  if ($busy.Count -eq 0 -and $queued -eq 0) { exit 0 }
  Start-Sleep -Seconds 240
}
exit 3
