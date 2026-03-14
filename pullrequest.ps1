$currentBranch = "darren"

git fetch origin
git checkout hack
git pull origin hack
git checkout darren
git merge hack

if ($LASTEXITCODE -ne 0) {
  Write-Host "Merge conflict! Fix conflicts then run: git add . && git commit"
  exit 1
}