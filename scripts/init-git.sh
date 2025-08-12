
#!/usr/bin/env bash
set -euo pipefail
git init
git add .
git commit -m "Initial commit: CryptoVerse site"
echo "Now create a repo on GitHub and push:"
echo "git remote add origin https://github.com/<you>/cryptoverse-affiliate-site.git"
echo "git branch -M main && git push -u origin main"
