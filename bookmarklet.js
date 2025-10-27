(function installSearchMonitorParseJSON() {
  if (window.__searchMonitorInstalled) {
    console.warn("Search monitor already installed.");
    return;
  }
  window.__searchMonitorInstalled = true;

  // Initialize global collection array
  if (!window.__collectedPlaces) {
    window.__collectedPlaces = [];
  }

  function matchesSearch(url) {
    try {
      const u = new URL(url, location.href);
      return u.pathname.includes("/search") || u.href.includes("/search");
    } catch {
      return String(url || "").includes("/search");
    }
  }

  function stripXssi(s) {
    return String(s).replace(/^\)\]\}'\s*\n?/, "");
  }
  function stripTrailingComment(s) {
    return String(s).replace(/\/\*[\s\S]*?\*\/\s*$/, "");
  }
  function tryParseJSON(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function parseGoogleSearchPayload(text) {
    if (!text) return null;
    let parsed = tryParseJSON(text);
    if (parsed) {
      if (parsed && parsed.d && typeof parsed.d === "string") {
        const inner = tryParseJSON(stripTrailingComment(stripXssi(parsed.d)));
        return inner ?? parsed;
      }
      return parsed;
    }
    const xssi = stripXssi(text);
    parsed = tryParseJSON(stripTrailingComment(xssi));
    if (parsed) return parsed;
    try {
      const unq = JSON.parse(
        '"' + text.replace(/\\([\s\S])/g, "\\$1").replace(/"/g, '\\"') + '"'
      );
      const inner = tryParseJSON(stripTrailingComment(stripXssi(unq)));
      if (inner) return inner;
    } catch {}
    return null;
  }

  function pretty(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return "[unserializable object: " + e.message + "]";
    }
  }

  // Create or update the export button
  function updateExportButton() {
    let btn = document.getElementById('__mapsExportBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = '__mapsExportBtn';
      btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        padding: 12px 24px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 24px;
        font-family: 'Google Sans', Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.2s;
      `;
      btn.onmouseover = () => {
        btn.style.background = '#357ae8';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      };
      btn.onmouseout = () => {
        btn.style.background = '#4285f4';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      };
      btn.onclick = () => {
        const places = window.__collectedPlaces;
        
        // Log grouped results like the parsing output
        console.groupCollapsed(`📍 Collected Places (${places.length} total)`);
        places.forEach((result, idx) => {
          console.groupCollapsed(
            `${idx + 1}. ${result.name || result.coordinates.string || "Unnamed"} ${
              result.rating ? "⭐ " + result.rating : ""
            }`
          );
          console.log(result);
          console.groupEnd();
        });
        console.groupEnd();
        
        // Generate CSV in Google Takeout format
        const csvRows = ['Title,Note,URL,Tags,Comment'];
        places.forEach(place => {
          const title = (place.name || place.coordinates.string || '').replace(/"/g, '""');
          const note = (place.timestampDate || '').replace(/"/g, '""');
          const url = place.placeId 
            ? `https://www.google.com/maps/place/?q=place_id:${place.placeId}`
            : (place.coordinates.lat && place.coordinates.lng)
              ? `https://www.google.com/maps/search/${place.coordinates.lat},${place.coordinates.lng}`
              : '';
          const tags = '';
          const comment = '';
          
          csvRows.push(`"${title}","${note}",${url},${tags},${comment}`);
        });
        
        const csvContent = csvRows.join('\n');
        
        // Log CSV content
        console.log('\n📄 CSV Content:\n');
        console.log(csvContent);
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `google-maps-starred-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`Downloaded ${places.length} places as CSV!`);
      };
      document.body.appendChild(btn);
    }
    btn.textContent = `📍 Export (${window.__collectedPlaces.length})`;
  }

  function maybePrettyPrintParsed(label, url, bodyText) {
    try {
      // Fallback: just show what we parsed
      const parsed = parseGoogleSearchPayload(bodyText);
      if (parsed != null) {
        const dParsed = parseGoogleSearchPayload(parsed.d);
        const dParsed64th = dParsed[64];
        console.log(dParsed64th);

        // Parse the search results into readable format
        if (Array.isArray(dParsed64th)) {
          const results = dParsed64th
            .filter(
              (item) =>
                Array.isArray(item) && item.length > 1 && Array.isArray(item[1])
            )
            .map((item) => {
              const data = item[1];
              
              // Try to extract timestamp from save lists (index 25)
              // Structure: data[25] contains arrays with list info
              // Each list entry: [[id, hash], "name", ..., timestamp, ...]
              let timestamp = null;
              
              if (Array.isArray(data[25]) && data[25].length > 3) {
                const saveListsData = data[25][3]; // Index 3 usually has user's lists
                if (Array.isArray(saveListsData)) {
                  // Look for entries with timestamps (index 10 in list metadata)
                  for (const listEntry of saveListsData) {
                    if (Array.isArray(listEntry) && listEntry[10]) {
                      // Found a list with a timestamp - use the most recent one
                      const ts = listEntry[10];
                      if (typeof ts === 'number' && (!timestamp || ts > timestamp)) {
                        timestamp = ts;
                      }
                    }
                  }
                }
              }
              
              // Fallback: Try data[25][1] which might have starred status with timestamp
              if (!timestamp && Array.isArray(data[25]) && Array.isArray(data[25][1])) {
                const starredEntry = data[25][1];
                // Look for timestamp in starred entry (could be at different positions)
                if (starredEntry.length > 10 && typeof starredEntry[10] === 'number') {
                  timestamp = starredEntry[10];
                }
              }
              
              // Extract Place ID - must start with "ChIJ" to be valid
              // Not all places have Place IDs - that's okay, we'll use coordinates
              let placeId = null;
              try {
                // Try direct location first
                const candidate = data[24]?.[0]?.[4];
                if (typeof candidate === 'string' && candidate.startsWith('ChIJ')) {
                  placeId = candidate;
                }
                
                // Fallback: extract from reviews URL if present
                if (!placeId && data[4]?.[3]?.[0]) {
                  const reviewsUrl = data[4][3][0];
                  if (typeof reviewsUrl === 'string') {
                    const match = reviewsUrl.match(/placeid=([A-Za-z0-9_-]+)/);
                    if (match && match[1].startsWith('ChIJ')) {
                      placeId = match[1];
                    }
                  }
                }
              } catch {}
              
              return {
                id: data[1] || null,
                name:
                  data[6] ||
                  (Array.isArray(data[3]) ? data[3].join(", ") : null),
                placeId: placeId,
                coordinates: {
                  lat: data[9]?.[2] || null,
                  lng: data[9]?.[3] || null,
                  string: data[11] || null,
                },
                address: Array.isArray(data[3])
                  ? data[3].join(", ")
                  : data[183] || null,
                fullAddress: data[18] || null,
                types: Array.isArray(data[13]) ? data[13] : [],
                rating: data[4]?.[7] || null,
                reviewCount: data[4]?.[8] || null,
                website: data[7]?.[0] || null,
                phone: data[178]?.[0]?.[0] || null,
                openingHours: data[34]?.[1] || null,
                photos:
                  (data[72] || data[92])?.slice(0, 3).map((p) => p?.[6]?.[0]) ||
                  [],
                categoryPath: data[76] || null,
                priceLevel: data[4]?.[2] || null,
                timestamp: timestamp,
                timestampDate: timestamp ? new Date(timestamp).toISOString() : null,
              };
            });

          // Append new results to the collection (avoid duplicates by placeId)
          results.forEach((result) => {
            const existingIndex = window.__collectedPlaces.findIndex(
              (p) => p.placeId && p.placeId === result.placeId
            );
            if (existingIndex === -1) {
              window.__collectedPlaces.push(result);
            }
          });

          // Update the export button
          updateExportButton();

          console.groupCollapsed(`📍 Parsed ${results.length} search results (Total: ${window.__collectedPlaces.length})`);
          results.forEach((result, idx) => {
            console.groupCollapsed(
              `${idx + 1}. ${result.coordinates.string || "Unnamed"} ${
                result.rating ? "⭐ " + result.rating : ""
              }`
            );
            console.log(result);
            console.groupEnd();
          });
          console.groupEnd();
        } else {
          console.log("Raw dParsed[64]:", dParsed64th);
        }
      }
    } catch (e) {
      console.error("[search-monitor] Error in maybePrettyPrintParsed:", e);
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const method = (init && init.method) || (input && input.method) || "GET";
      const url = (input && input.url) || input;
      if (matchesSearch(url)) {
        if (input instanceof Request) {
          input
            .clone()
            .text()
            .then((bodyText) => {
              console.info("[search-monitor] fetch request detected", {
                type: "fetch",
                method,
                url: input.url || url,
                body: bodyText || (init && init.body) || null,
              });
            })
            .catch(() =>
              console.info(
                "[search-monitor] fetch request detected (no body)",
                { type: "fetch", method, url }
              )
            );
        } else {
          console.info("[search-monitor] fetch request detected", {
            type: "fetch",
            method,
            url,
            body: (init && init.body) || null,
          });
        }
      }
    } catch {}
    return originalFetch.apply(this, arguments).then((response) => {
      try {
        if (matchesSearch(response.url)) {
          response
            .clone()
            .arrayBuffer()
            .then((buf) => {
              let text = "";
              try {
                text = new TextDecoder().decode(new Uint8Array(buf));
              } catch {
                text = `[arraybuffer ${buf ? buf.byteLength : 0} bytes]`;
              }
              const hdrs = {};
              try {
                for (const [k, v] of response.headers.entries()) hdrs[k] = v;
              } catch {}
              console.info("[search-monitor] fetch response detected", {
                type: "fetch",
                url: response.url,
                status: response.status,
                headers: hdrs,
                body: text,
              });
              if (typeof text === "string")
                maybePrettyPrintParsed(
                  "[search-monitor] fetch response",
                  response.url,
                  text
                );
            })
            .catch(() => {
              response
                .clone()
                .text()
                .then((t) => {
                  const hdrs = {};
                  try {
                    for (const [k, v] of response.headers.entries())
                      hdrs[k] = v;
                  } catch {}
                  console.info("[search-monitor] fetch response detected", {
                    type: "fetch",
                    url: response.url,
                    status: response.status,
                    headers: hdrs,
                    body: t,
                  });
                  if (typeof t === "string")
                    maybePrettyPrintParsed(
                      "[search-monitor] fetch response",
                      response.url,
                      t
                    );
                })
                .catch(() =>
                  console.info(
                    "[search-monitor] fetch response detected (no body)",
                    {
                      type: "fetch",
                      url: response.url,
                      status: response.status,
                    }
                  )
                );
            });
        }
      } catch {}
      return response;
    });
  };

  const OriginalXHR = window.XMLHttpRequest;

  function readXhrResponse(xhr, cb) {
    try {
      const rt = xhr.responseType;
      if (rt === "arraybuffer" && xhr.response) {
        try {
          cb(new TextDecoder().decode(new Uint8Array(xhr.response)));
        } catch {
          cb(`[arraybuffer ${xhr.response.byteLength || 0} bytes]`);
        }
      } else if (rt === "blob" && xhr.response) {
        try {
          const fr = new FileReader();
          fr.onload = () => cb(String(fr.result));
          fr.onerror = () => cb("[blob read error]");
          fr.readAsText(xhr.response);
        } catch {
          cb("[blob unreadable]");
        }
      } else if (rt === "document" && xhr.response) {
        try {
          cb(new XMLSerializer().serializeToString(xhr.response));
        } catch {
          cb("[document response]");
        }
      } else if (rt === "json") {
        try {
          cb(JSON.stringify(xhr.response));
        } catch {
          cb("[json unreadable]");
        }
      } else {
        try {
          cb(xhr.responseText);
        } catch {
          try {
            cb(
              typeof xhr.response === "string"
                ? xhr.response
                : "[non-text response or unavailable]"
            );
          } catch {
            cb("[error reading response]");
          }
        }
      }
    } catch (e) {
      cb("[error reading response: " + e + "]");
    }
  }

  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let _url = null,
      _method = null,
      _requestHeaders = {};
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    xhr.open = function (method, url) {
      _method = method;
      _url = url;
      return originalOpen.apply(this, arguments);
    };
    xhr.setRequestHeader = function (header, value) {
      try {
        _requestHeaders[header] = value;
      } catch {}
      return OriginalXHR.prototype.setRequestHeader.apply(this, arguments);
    };

    function logIfDone() {
      if (xhr.readyState === 4) {
        const respUrl = xhr.responseURL || _url;
        if (!matchesSearch(respUrl)) return;
        let respHeaders = "[unavailable]";
        try {
          respHeaders = xhr.getAllResponseHeaders
            ? xhr.getAllResponseHeaders()
            : respHeaders;
        } catch {}
        readXhrResponse(xhr, function (bodyText) {
          console.info("[search-monitor] XHR response detected", {
            type: "xhr",
            method: _method,
            url: respUrl,
            status: xhr.status,
            headers: respHeaders,
            body: bodyText,
          });
          if (typeof bodyText === "string") {
            maybePrettyPrintParsed(
              "[search-monitor] XHR response",
              respUrl,
              bodyText
            );
          }
        });
      }
    }

    xhr.addEventListener("load", logIfDone);
    xhr.addEventListener("readystatechange", logIfDone);
    xhr.addEventListener("error", function () {
      const respUrl = xhr.responseURL || _url;
      if (matchesSearch(respUrl)) {
        console.info("[search-monitor] XHR error", {
          type: "xhr",
          method: _method,
          url: respUrl,
          status: xhr.status,
        });
      }
    });

    xhr.send = function (body) {
      try {
        if (matchesSearch(_url)) {
          let safeBody = null;
          try {
            if (body == null) safeBody = null;
            else if (typeof body === "string") safeBody = body;
            else if (body instanceof FormData) {
              const pairs = [];
              for (const p of body.entries()) pairs.push(`${p[0]}=${p[1]}`);
              safeBody = pairs.join("&");
            } else if (body instanceof ArrayBuffer) {
              safeBody = `[arraybuffer ${body.byteLength} bytes]`;
            } else if (ArrayBuffer.isView(body)) {
              safeBody = `[typed array ${body.byteLength} bytes]`;
            } else {
              try {
                safeBody = JSON.stringify(body);
              } catch {
                safeBody = "[unserializable body]";
              }
            }
          } catch {
            safeBody = "[error reading body]";
          }
          console.info("[search-monitor] XHR request detected", {
            type: "xhr",
            method: _method,
            url: _url,
            headers: _requestHeaders,
            body: safeBody,
          });
        }
      } catch {}
      return originalSend.apply(this, arguments);
    };

    return xhr;
  }

  PatchedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  console.info(
    'Search monitor installed — requests & responses (incl. JSON parsing) for "/search".'
  );
})();
