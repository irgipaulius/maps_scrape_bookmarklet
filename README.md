# Google Maps Starred Locations Scraper 📍

A vibe-coded bookmarklet that reads and parses Google Maps, and allows downloading Starred Locations as CSV.

## What It Does

This bookmarklet intercepts Google Maps search API responses and extracts detailed information about your saved locations. When you open any of your lists (including Starred Places), it parses the data on-the-fly and provides a download button to export everything as a clean CSV file.

**Extracted data includes:**
- Place name and ID
- Full address and coordinates
- Ratings and review counts
- Website and phone numbers
- Opening hours
- Category/type information
- Photos (URLs)
- Price level
- Timestamps (when available)

## How to Use

1. **Copy the bookmarklet code**
   - Open `bookmarklet.txt` in this repo
   - Copy the entire contents (starts with `javascript:`)

2. **Create a bookmark**
   - In your browser, create a new bookmark (usually Cmd/Ctrl+D or right-click bookmarks bar)
   - Name it something like "📍 Scrape Maps"
   - Paste the copied code into the URL/Address field

3. **Navigate to Google Maps**
   - Go to [google.com/maps](https://www.google.com/maps)
   - Sign in to your Google account

4. **Open your list**
   - Click on "Saved" in the left sidebar (or the menu icon ≡)
   - Select the list you want to scrape (e.g., "Starred places", "Want to go", etc.)
   - Click your bookmark from the bookmarks bar

5. **Scroll to load all items**
   - **IMPORTANT**: Scroll down through your entire list until all locations are loaded
   - Google Maps lazy-loads items, so you need to scroll to the bottom
   - Wait for the page to finish loading (no more spinners)

6. **Run the bookmarklet**
   - Open your browser's Developer Console (F12 or Cmd+Option+I on Mac)
   - You should see parsed results logged in the console
   - A download button will appear or CSV will be automatically generated

7. **Download your data**
   - Your locations will be exported as a CSV file
   - Open in Excel, Google Sheets, or any spreadsheet software

## 🔒 Security & Trust

**Don't trust random code on the internet?** Good! Here's how to verify:

1. **Review the source code**
   - The unminified source is in `bookmarklet.js`
   - Copy it to ChatGPT/Claude and ask: *"Is this code safe? Does it send data anywhere?"*
   - The code ONLY reads Google Maps responses and exports them as CSV
   - **No data is sent to external servers**
   - **No API keys or credentials are stolen**
   - **It's pure client-side JavaScript**

2. **Verify the minified version yourself**
   - Copy the contents of `bookmarklet.js`
   - Use an online minifier like [toptal.com/developers/javascript-minifier](https://www.toptal.com/developers/javascript-minifier)
   - Prepend `javascript:` to the minified output
   - Now you compiled the bookmarklet yourself!

3. **How it works**
   - The script intercepts `fetch()` and `XMLHttpRequest` calls
   - It looks for Google Maps `/search` endpoints
   - Parses the responses
   - Formats it into readable JSON/CSV

## ⚠️ Disclaimer: Vibe-Coded in a Day

This was **vibe-coded in a single day** out of frustration with Google's data gatekeeping. It works, but it's not my proudest achievement.

- The parsing logic is based on reverse-engineering Google's response format
- Array indices are hard-coded (e.g., `dParsed[64]`, `data[25]`)
- Google could change their API response structure at any time and break this. At which point the logic could be updated, and it will work again.
- Error handling is minimal

If it breaks, feel free to fork it and fix it. Or wait for me to notice and update it. Or just curse at Google with me (see below).

## 😤 A Message About Data Ownership

**FUCK GOOGLE FOR GATEKEEPING OUR OWN DATA.**

This is YOUR data. You starred these places. You wrote these reviews. You created these lists. **It belongs to YOU**, not Google.

Personally, I have over 4000 starred locations over the past 5 years of travelling in Europe. It took a lot of effort! and I want to claim the data for myself.

Yet Google makes it nearly impossible to bulk export your own Starred locations. Why? To keep you locked into their ecosystem. To prevent you from easily migrating to competitors. To maintain their monopoly on local business data.

**This bookmarklet does NOT infringe on Google's Terms of Service** because:
- We're accessing PUBLIC endpoints that your browser already uses
- We're reading data that belongs to YOU
- We're not scraping other users' data
- We're not automating requests or creating bots
- We're simply parsing responses that Google is already sending to your browser

This is digital self-defense. This is taking back what's ours.

## 🚫 Why Other Approaches Don't Work

If you've tried to export your Starred Places before, you've probably hit these walls:

### Google Takeout
- **Doesn't include Starred Places** in the export
- Only exports public lists which you created

### `entitydata/getlist` API Endpoint
- Only works when you're "invited to share" a list
- **Starred Places cannot be shared** (it's a private list)

### Maps API
- Doesn't provide endpoints to get your private saved lists

### Other Scrapers/Puppeteer Solutions
- Require installation of tools
- Need complex setup (Node.js, Puppeteer, browser drivers)
- Often break when Google updates their UI
- Potential TOS violations due to automation

### Why This Bookmarklet is Better

✅ **No installation** - just a bookmark  
✅ **No API keys** - uses your existing session  
✅ **No automation** - you manually load the page  
✅ **No reverse-engineering** - just parsing responses  
✅ **Works right now** - click and download  
✅ **Open source** - audit the code yourself  

It's the **easiest, fastest, and most transparent** way to get YOUR data back.

## Technical Details

The bookmarklet works by:

1. Monkey-patching `window.fetch` and `XMLHttpRequest`
2. Intercepting responses from Google Maps search endpoints
3. Parsing the nested JSON structure (which includes XSSI protection prefixes)
4. Extracting place data from deeply nested arrays
5. Formatting the data into a readable structure
6. Providing CSV export functionality

The code attempts to extract timestamps from save list metadata, but Google's response format varies. Some fields may be `null` depending on the place data.


**Remember**: This is a hack. A useful hack, but a hack nonetheless. Use it while it works, and may it serve you well in your quest to reclaim your own data. 🚀