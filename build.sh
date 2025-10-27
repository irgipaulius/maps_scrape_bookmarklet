#!/bin/bash

# Read the JS file and minify it using Toptal's API
echo "Minifying bookmarklet.js..."

minified=$(curl -s -X POST \
  --data-urlencode "input@bookmarklet.js" \
  https://www.toptal.com/developers/javascript-minifier/api/raw)

# Prepend javascript: and write to bookmarklet.txt
echo "javascript:$minified" > bookmarklet.txt

echo "✅ Done! bookmarklet.txt updated"
