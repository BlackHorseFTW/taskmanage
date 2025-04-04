# PowerShell script to build the project with ESLint disabled
$env:ESLINT_CONFIG_PATH = ".eslintrc-build.json"
$env:NEXT_DISABLE_ESLINT = "1"
npx next build 