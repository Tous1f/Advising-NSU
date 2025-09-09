# Run these commands in PowerShell from e:\advising\app

# 1. Remove the duplicate workflow from app folder
Remove-Item -Recurse -Force .github

# 2. Add and commit all changes including new icons
git add icon-192.png icon-512.png icons.svg index.html manifest.json README.md
git commit -m "chore: add local PWA icons and manifest links"

# 3. Push to GitHub
git push origin main
