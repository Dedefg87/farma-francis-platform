@echo off
cd /d %~dp0

echo Cleaning dist folders...
if exist dist rmdir /s /q dist
if exist client\dist rmdir /s /q client\dist
if exist public rmdir /s /q public

echo Building client...
set NODE_ENV=production
npx vite build

echo Building server...
npx esbuild server/index.ts --platform=node --bundle --format=cjs --outfile=dist/index.js --packages=external --external:vite --external:@vitejs/plugin-react --external:@tailwindcss/vite --external:@builder.io/vite-plugin-jsx-local --external:vite-plugin-monus-runtime --loader:.ts=ts

echo Creating dist/public...
if not exist dist\public mkdir dist\public
xcopy /e /i /y client\dist\* dist\public\

echo Creating package.json for dist...
echo {"type":"commonjs"} > dist\package.json

echo Done!