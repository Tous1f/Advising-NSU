# CourseWizard Deployment Preparation Script
# Run this in PowerShell to prepare your files for sharing

Write-Host "🚀 Preparing CourseWizard for deployment..." -ForegroundColor Green

# Check if all required files exist
$requiredFiles = @(
    "index.html",
    "app.js", 
    "data.js",
    "styles.css",
    "manifest.json",
    "service-worker.js",
    "icon-192.png",
    "icon-512.png",
    "favicon.ico",
    "icons.svg"
)

Write-Host "📋 Checking required files..." -ForegroundColor Yellow

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $file - MISSING!" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n⚠️  Missing files detected. Please ensure all files are present." -ForegroundColor Red
    Write-Host "Missing files: $($missingFiles -join ', ')" -ForegroundColor Red
    exit 1
}

# Create deployment folder
$deployFolder = "CourseWizard-Deploy"
if (Test-Path $deployFolder) {
    Remove-Item $deployFolder -Recurse -Force
}

New-Item -ItemType Directory -Name $deployFolder | Out-Null

# Copy all files to deployment folder
Write-Host "`n📁 Creating deployment folder..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    Copy-Item $file -Destination $deployFolder
    Write-Host "📄 Copied $file" -ForegroundColor Cyan
}

# Create README for deployment
$readmeContent = @"
# CourseWizard - Smart Schedule Generator

## How to Use
1. Open `index.html` in your web browser
2. Select your courses
3. Choose day preferences (4-day, 5-day, or 6-day)
4. Select preferred faculty
5. Generate your perfect schedule!

## Features
- 🎯 Smart course scheduling
- 📅 4, 5, or 6-day week options
- 👨‍🏫 Faculty preference selection
- 🔗 Automatic lab-theory pairing
- 📱 Mobile-friendly interface
- 🌙 Dark/light theme

## For Developers
- Pure HTML/CSS/JavaScript
- No dependencies
- Works offline
- PWA ready

## Deployment
This app can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Enjoy your perfectly scheduled semester! 🎓
"@

$readmeContent | Out-File -FilePath "$deployFolder/README.md" -Encoding UTF8

Write-Host "`n✅ Deployment folder created: $deployFolder" -ForegroundColor Green
Write-Host "📦 Ready for deployment!" -ForegroundColor Green

Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Upload the '$deployFolder' contents to GitHub/Netlify/Vercel" -ForegroundColor White
Write-Host "2. Or zip the folder and share with friends" -ForegroundColor White
Write-Host "3. Share the link with your university friends!" -ForegroundColor White

Write-Host "`n🎉 Happy scheduling!" -ForegroundColor Green
