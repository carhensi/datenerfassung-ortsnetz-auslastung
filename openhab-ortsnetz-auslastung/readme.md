~~📢 ** v1.2: Automatische Standorterkennung & PV-Erweiterung für openHAB**

~~**Es gibt ein größeres Update für die openHAB-Integration zur Datenübertragung an Ortsnetz-Auslastung.de. Das Skript wurde erweitert, um die Datenbasis weiter zu verbessern und die Einrichtung für neue Nutzer zu vereinfachen.**

~~✨ **Neue Features in Version 1.2:**

1. ~~**Automatische Standorterkennung: Die Geokoordinaten (Breiten- und Längengrad) werden nun vollautomatisch aus den *Regional Settings* von openHAB ausgelesen. Man muss sie nicht mehr manuell im Node-Skript eintragen.**

2. ~~**Koordinatenrundung: Die ausgelesenen Koordinaten im Node-Skript werden automatisch auf exakt 6 Nachkommastellen gerundet, bevor sie die API erreichen.**

3. ~~**Optionale PV-Daten (kWp & Forecast): Es können nun optional die installierte Peak-Leistung (`pv\_kwp`) und die heutige Ertragsprognose (`pv\_forecast\_today\_kwh`) übermittelt werden.**

~~💡 **Wichtig: Volle Abwärtskompatibilität!**

~~**Wer keine PV-Daten nutzt oder keinen Standort in openHAB gepflegt hat, muss nichts tun. Die Skripte fangen fehlende Items oder Werte über `try-catch`-Blöcke ab. Fehlen die PV-Items, werden sie ignoriert. Fehlt der Standort, greift das Skript auf sichere Standard-Fallback-Koordinaten zurück.**


~~🔧 **Schritt 1.1: Notwendiges Addin**

~~**JSONPath Addon**

```
~~**Man kann entweder über die WebUI dieses Addon anlegen oder über die Konsole  
`openhab-cli console`**

~~**`feature:install openhab-transformation-jsonpath`**

~~**`logout `**
```

~~🔧 **Schritt 1.2:Items anlegen**

~~**Die Items nehmen die Rückmeldungen der API auf. Alle Items sind vom Typ string:**

~~**Ortsnetz\_L1\_Ampel  
Ortsnetz\_L2\_Ampel  
Ortsnetz\_L3\_Ampel  
Ortsnetz\_Overall\_Ampel  
Ortsnetz\_API\_Status **

~~🔧 **Schritt 1.3: Optionale Items anlegen (Nur bei PV-Nutzung)**

~~**Wer die PV-Statistiken mitsenden möchte, legt einfach zwei neue openHAB-Items an:**

- ~~**`Smartmeter\_PV\_KWP` (Typ: `Number`, z. B. `10.5` für die installierte kWp-Leistung)**

- ~~**`Smartmeter\_PV\_Forecast` (Typ: `Number`, z. B. für die prognostizierten Tages-kWh aus Bindings wie *SolarForecast oder über die API des Victron VRM Portals*)**


~~📄 **Schritt 2: openHAB JavaScript Rule anlegen (`ortsnetz.js`)**

~~**Jetzt müssen wir im Dateisystem zwei Dateien anlegen. logt euch dazu über ssh auf openhab ein**

~~**Passt bitte im Script "Smartmeter\_L1\_Volt", "Smartmeter\_L1\_Volt", "Smartmeter\_L1\_Volt" sowie "Smartmeter\_Frequenz" an eure itemnamen an **

~~**Die Rule fragt  den internen openHAB-Standortdienst (`LocationProvider`) ab, liest die optionalen Items ein und übergibt alle Daten als erweiterte 8-teilige Argumentenkette an das Hilfsskript.**

~~**Pfad: `/srv/openhab-conf/automation/js/ortsnetz.js`**

~~**javascript**

```
~~**`const \{ rules, triggers, items \} = require('openhab');`**


~~**`rules.JSRule(\{`**

~~`    **name: "Spannungsdaten alle 5 Minuten an Ortsnetz-Auslastung senden",`**

~~`    **description: "Sendet Smartmeter-Daten über das fehlerfreie Node-Hilfsskript an die API",`**

~~`    **triggers: \[`**

~~`        **triggers.GenericCronTrigger("0 \*/5 \* ? \* \*")`**

~~`    **\],`**

~~`    **execute: () =\> \{`**

~~`        **// 1. Pflicht-Items einlesen`**

~~`        **const itemL1 = items.getItem('Smartmeter\_L1\_Volt');`**

~~`        **const itemL2 = items.getItem('Smartmeter\_L2\_Volt');`**

~~`        **const itemL3 = items.getItem('Smartmeter\_L3\_Volt');`**

~~`        **const itemHz = items.getItem('Smartmeter\_Frequenz');`**


~~`        **if (itemL1.state === 'NULL' || itemL1.state === 'UNDEF' ||`**

~~`            **itemL2.state === 'NULL' || itemL2.state === 'UNDEF' ||`**

~~`            **itemL3.state === 'NULL' || itemL3.state === 'UNDEF' ||`**

~~`            **itemHz.state === 'NULL' || itemHz.state === 'UNDEF') \{`**

~~`            **console.warn("Ortsnetz: Senden abgebrochen, da Pflicht-Sensorwerte ungültig (NULL/UNDEF) sind.");`**

~~`            **return;`**

~~`        **\}`**


~~`        **const l1 = itemL1.state;`**

~~`        **const l2 = itemL2.state;`**

~~`        **const l3 = itemL3.state;`**

~~`        **const hz = itemHz.state;`**


~~`        **// Globalen openHAB-Standort ermitteln`**

~~`        **let latitude = "53.000000";   // Fallback-Wert`**

~~`        **let longitude = "7.000000";   // Fallback-Wert`**


~~`        **try \{`**

~~`            **const \{ osgi \} = require('openhab');`**

~~`            **const LocationService = Java.type('org.openhab.core.i18n.LocationProvider');`**

~~`            **const locationService = osgi.getService(LocationService);`**

~~`            `

~~`            **if (locationService && locationService.getLocation()) \{`**

~~`                **const ohLocation = locationService.getLocation().toString(); // Liefert "lat,lon,alt"`**

~~`                **const coords = ohLocation.split(',');`**

~~`                **if (coords && coords\[0\] && coords\[1\]) \{`**

~~`                    **latitude = coords\[0\].trim();`**

~~`                    **longitude = coords\[1\].trim();`**

~~`                **\}`**

~~`            **\}`**

~~`        **\} catch (e) \{`**

~~`            **console.warn("Ortsnetz: Konnte System-Standort nicht auslesen, nutze Default-Koordinaten. Fehler: " + e);`**

~~`        **\}`**


~~`        **// 2. Optionale PV-Items einlesen`**

~~`        **let kwp = "";`**

~~`        **let forecast = "";`**

~~`        `

~~`        **try \{`**

~~`            **const itemKwp = items.getItem('Smartmeter\_PV\_KWP');`**

~~`            **if (itemKwp && itemKwp.state !== 'NULL' && itemKwp.state !== 'UNDEF') \{`**

~~`                **kwp = itemKwp.state;`**

~~`            **\}`**

~~`        **\} catch (e) \{`**

~~`            **// Item existiert nicht -\> Bleibt leerer String`**

~~`        **\}`**


~~`        **try \{`**

~~`            **const itemForecast = items.getItem('Smartmeter\_PV\_Forecast');`**

~~`            **if (itemForecast && itemForecast.state !== 'NULL' && itemForecast.state !== 'UNDEF') \{`**

~~`                **forecast = itemForecast.state;`**

~~`            **\}`**

~~`        **\} catch (e) \{`**

~~`            **// Item existiert nicht -\> Bleibt leerer String`**

~~`        **\}`**


~~`        **console.info("Ortsnetz: Sende Daten via nativer Linux-Prozess-Pipeline...");`**


~~`        **try \{`**

~~`            **// 3. Native Java Prozess-Pipeline`**

~~`            **const ProcessBuilder = java.lang.ProcessBuilder;`**

~~`            **const BufferedReader = java.io.BufferedReader;`**

~~`            **const InputStreamReader = java.io.InputStreamReader;`**

~~`            **const Collectors = java.util.stream.Collectors;`**


~~`            **// Übergibt alle 8 Argumente (Pflicht + Optionale + Standort)`**

~~`            **const pb = new ProcessBuilder(\[`**

~~`                **"/usr/bin/node", `**

~~`                **"/srv/openhab-conf/misc/ortsnetz\_senden.js", `**

~~`                **String(l1), String(l2), String(l3), String(hz), `**

~~`                **String(kwp), String(forecast),`**

~~`                **String(latitude), String(longitude)`**

~~`            **\]);`**

~~`            `

~~`            **pb.redirectErrorStream(true);`**

~~`            **const process = pb.start();`**


~~`            **// Liest die Konsolenausgabe des Skripts ein`**

~~`            **const reader = new BufferedReader(new InputStreamReader(process.getInputStream()));`**

~~`            **const responseBody = reader.lines().collect(Collectors.joining("\\n")).trim();`**

~~`            **process.waitFor();`**


~~`            **// 4. API-Antwort verarbeiten`**

~~`            **if (responseBody && responseBody.includes('\{')) \{`**

~~`                **console.info("Ortsnetz: API Antwort erfolgreich verarbeitet! Inhalt: " + responseBody);`**

~~`                `

~~`                **const resData = JSON.parse(responseBody);`**

~~`                `

~~`                **items.getItem('Ortsnetz\_L1\_Ampel').postUpdate(resData.status.l1.trim());`**

~~`                **items.getItem('Ortsnetz\_L2\_Ampel').postUpdate(resData.status.l2.trim());`**

~~`                **items.getItem('Ortsnetz\_L3\_Ampel').postUpdate(resData.status.l3.trim());`**

~~`                **items.getItem('Ortsnetz\_Overall\_Ampel').postUpdate(resData.status.overall.trim());`**

~~`                **items.getItem('Ortsnetz\_API\_Status').postUpdate('Erfolgreich');`**

~~`            **\} else \{`**

~~`                **console.error("Ortsnetz: Unerwartete Konsolenausgabe: " + responseBody);`**

~~`                **items.getItem('Ortsnetz\_API\_Status').postUpdate('Fehler');`**

~~`            **\}`**

~~`        **\} catch (error) \{`**

~~`            **console.error("Ortsnetz: Fehler in der Prozess-Pipeline: " + error);`**

~~`            **items.getItem('Ortsnetz\_API\_Status').postUpdate('Systemfehler');`**

~~`        **\}`**

~~`    **\}`**

~~**`\});`**
```



~~📄 **Schritt 3: Node-Skript anlegen (`ortsnetz\_senden.js`)**

~~**Das eigenständige Node-Skript verarbeitet nun die neuen Argumente, kürzt die Koordinaten auf 6 Stellen und baut das API-JSON dynamisch zusammen.  
*Passt bitte latitude und longitude an eure Koordinaten an, falls der Standort nicht in openhab gepflegt ist.**

~~**Pfad: `/srv/openhab-conf/misc/ortsnetz\_senden.js`**

~~**javascript**

```
~~**`const https = require('https');`**

~~**`// Openhab Ortsnetz V: 0.2`**

~~**`// Version Date: 2026-09-19`**

~~**`// added optional installed kwp and pv forecast`**


~~**`// Holt alle übergebenen Argumente aus der Konsole`**

~~**`const args = process.argv.slice(2);`**

~~**`const l1 = parseFloat(args\[0\]) || 230.0;`**

~~**`const l2 = parseFloat(args\[1\]) || 230.0;`**

~~**`const l3 = parseFloat(args\[2\]) || 230.0;`**

~~**`const hz = parseFloat(args\[3\]) || 50.0;`**


~~**`// Optionale PV-Werte prüfen`**

~~**`const rawKwp = args\[4\];`**

~~**`const rawForecast = args\[5\];`**


~~**`// Dynamische Koordinaten mit Fallback parsen`**

~~**`const rawLat = parseFloat(args\[6\]) || 53.000000;`**

~~**`const rawLon = parseFloat(args\[7\]) || 7.000000;`**


~~**`// Koordinaten mathematisch auf exakt 6 Nachkommastellen runden`**

~~**`const lat = parseFloat(rawLat.toFixed(6));`**

~~**`const lon = parseFloat(rawLon.toFixed(6));`**


~~**`// ISO-Zeitstempel bauen`**

~~**`const now = new Date().toISOString().split('.')\[0\] + 'Z';`**


~~**`// Basis-Payload mit dynamischen Pflichtfeldern`**

~~**`const dataObject = \{`**

~~`  **observed\_at: now,`**

~~`  **latitude: lat,`**

~~`  **longitude: lon,`**

~~`  **l1\_v: l1,`**

~~`  **l2\_v: l2,`**

~~`  **l3\_v: l3,`**

~~`  **grid\_frequency\_hz: hz,`**

~~`  **integration\_version: 'Openhab Ortsnetz V: 0.2'`**

~~**`\};`**


~~**`// Optionale PV-Felder nur hinzufügen, wenn sie übergeben wurden`**
```

~~**`if (rawForecast && rawForecast.trim() !== "" && !isNaN(rawForecast)) \{ dataObject.pv\_forecast\_kwh = parseFloat(rawForecast); \}`**

~~**`if (rawKwp && rawKwp.trim() !== "" && !isNaN(rawKwp)) \{ dataObject.plant\_capacity\_kwp = parseFloat(rawKwp); \}`**


```
~~**`const payload = JSON.stringify(dataObject);`**



~~**`const options = \{`**

~~`  **hostname: 'www.ortsnetz-auslastung.de',`**

~~`  **port: 443,`**

~~`  **path: '/v1/measurements',`**

~~`  **method: 'POST',`**

~~`  **headers: \{`**

~~`    **'Content-Type': 'application/json',`**

~~`    **'Content-Length': Buffer.byteLength(payload),`**

~~`    **'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',`**

~~`    **'Accept': 'application/json'`**

~~`  **\}`**

~~**`\};`**


~~**`const req = https.request(options, (res) =\> \{`**

~~`  **let body = '';`**

~~`  **res.on('data', (chunk) =\> body += chunk);`**

~~`  **res.on('end', () =\> console.log(body));`**

~~**`\});`**


~~**`req.on('error', (e) =\> console.log(\`\{"error":"$\{e.message\}"\}\`));`**

~~**`req.write(payload);`**

~~**`req.end();`**


~~📄 **Hinweis zu den Forecast Zahlen**

~~**`Sollten eure Solar Forecast Zahlen als wh vorliegen, dann müssen diese in kwh übergeben werden. Daher hier am einfachsten die eingehenden Werte dem Item über ein transformation JS anpassen`**

~~**`Beispiel:`**

```
~~**`durch1000.js`**

~~**`(function(input) \{`**

~~**`    if (input === undefined || input === null || input === "") \{`**

~~**`        return null;`**

~~**`    \}`**

~~**`    var ergebnis = parseFloat(input) / 1000;`**

~~**`    return isNaN(ergebnis) ? input : ergebnis.toString();`**

~~**`\})(input);`**


~~**`Jetzt müsst ihr dem Item nur noch dieses Script zuweisen`**




