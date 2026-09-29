# Volkszähler → Ortsnetz-Auslastung

Python-Script, das die Phasenspannungen eines Smart Meters aus der [Volkszähler](https://volkszaehler.org)-Middleware liest und an [ortsnetz-auslastung.de](https://www.ortsnetz-auslastung.de) überträgt. Optional werden Netzfrequenz, installierte PV-Leistung und die PV-Tagesprognose mitgesendet.

Das Script wird per cron gestartet und führt pro Aufruf genau eine Messung und Übertragung aus.

## Funktionsweise

1. Alle konfigurierten Kanäle werden mit einer einzigen Anfrage an die Middleware abgefragt:
```
	http://<VZ_HOST_PORT>/data.json?uuid[]=…&from=<beginstamp>&to=<endstamp>
```
	Das Zeitfenster reicht von `MAX_ALTER_S` Sekunden in der Vergangenheit bis jetzt.
2. Pro Kanal wird das jüngste Tupel verwendet und geprüft:
	- Spannungen: größer 0 V und höchstens 500 V
	- Netzfrequenz: größer 45 Hz und höchstens 55 Hz
	- Alter: höchstens `MAX_ALTER_S` Sekunden
3. Der Zeitstempel des L1-Werts wird als `observed_at` (UTC) übernommen.
4. Die Messung wird per `POST` an `https://www.ortsnetz-auslastung.de/v1/measurements` gesendet. Der Ampelstatus je Phase aus der Antwort wird ins Log geschrieben.

Fehlt ein Spannungswert oder ist er ungültig, wird nichts gesendet. Eine fehlende oder ungültige Netzfrequenz bzw. PV-Prognose wird weggelassen, die Messung geht trotzdem raus.

## Voraussetzungen

- Linux mit cron
- Python ab 3.8 (nur Standardbibliothek, keine zusätzlichen Pakete)
- Volkszähler-Middleware, im lokalen Netz per HTTP erreichbar
- Smart Meter, dessen Info-Schnittstelle die Spannungen ausgibt (OBIS `1-0:32.7.0`, bei dreiphasigen Zählern zusätzlich `1-0:52.7.0` und `1-0:72.7.0`). Viele moderne Messeinrichtungen liefern diese Werte erst nach Eingabe der PIN.

## Volkszähler einrichten

### Kanäle anlegen

Pro Phase wird ein Kanal vom Typ **Spannungssensor** (`voltage`) angelegt, für die Netzfrequenz optional ein Kanal vom Typ **Frequenz** (`frequency`). Die Auflösung bleibt leer oder auf 1.

```bash
curl "http://localhost:8080/channel.json?operation=add&type=voltage&title=Spannung%20L1"
curl "http://localhost:8080/channel.json?operation=add&type=voltage&title=Spannung%20L2"
curl "http://localhost:8080/channel.json?operation=add&type=voltage&title=Spannung%20L3"
curl "http://localhost:8080/channel.json?operation=add&type=frequency&title=Netzfrequenz"
```

Jede Antwort enthält die UUID des neuen Kanals. Die Kanäle müssen nicht öffentlich sein.

### vzlogger

Die Spannungskanäle werden wie die übrigen Kanäle des Zählers eingetragen:

```json
{
	"api": "volkszaehler",
	"uuid": "<UUID L1>",
	"middleware": "127.0.0.1:8080",
	"identifier": "1-0:32.7.0*255",
	"duplicates": 60
},
{
	"api": "volkszaehler",
	"uuid": "<UUID L2>",
	"middleware": "127.0.0.1:8080",
	"identifier": "1-0:52.7.0*255",
	"duplicates": 60
},
{
	"api": "volkszaehler",
	"uuid": "<UUID L3>",
	"middleware": "127.0.0.1:8080",
	"identifier": "1-0:72.7.0*255",
	"duplicates": 60
},
{
	"api": "volkszaehler",
	"uuid": "<UUID Frequenz>",
	"middleware": "127.0.0.1:8080",
	"identifier": "1-0:14.7.0*255",
	"duplicates": 60
}
```

Alle Werte gehen damit sofort an die Middleware, und das Frontend zeigt sie ohne Verzögerung an.

### Nachkommastellen im Frontend

In `htdocs/js/options.js` sorgt folgende Einstellung für eine Nachkommastelle bei Spannungen und zwei bei der Netzfrequenz:

```js
vz.options = {
	precision: 3,
	maxPrecision: {
		'°C': 1,
		'V': 1,
		'W': 1
	},
	…
```

`maxPrecision` begrenzt die Nachkommastellen pro Einheit. Mit `'W': 0` bleiben Leistungen ganzzahlig.

## Installation

```bash
sudo mkdir /opt/ortsnetz-auslastung
sudo chown $USER: /opt/ortsnetz-auslastung
cp ortsnetz_auslastung.py /opt/ortsnetz-auslastung/
chmod 755 /opt/ortsnetz-auslastung/ortsnetz_auslastung.py
```

Das Verzeichnis gehört dem Benutzer, unter dem das Script läuft. So kann ein anderes Script dort die PV-Tagesprognose ablegen.

## Konfiguration

Die Konfiguration steht im Block am Anfang von `ortsnetz_auslastung.py`.

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `VZ_HOST_PORT` | ja | Host und Port der Middleware, z. B. `"localhost:8080"` |
| `UUID_L1` | ja | UUID des Spannungskanals L1 |
| `UUID_L2`, `UUID_L3` | – | UUIDs der Spannungskanäle L2 und L3. Beide leer bei einphasiger Messung, dann wird `-1` gesendet |
| `UUID_FREQUENZ` | – | UUID des Frequenzkanals, leer = keine Frequenz |
| `LATITUDE`, `LONGITUDE` | ja | Ungefährer Standort in Dezimalgrad, z. B. `49.87` und `8.65` |
| `PLANT_CAPACITY_KWP` | – | Installierte PV-Leistung in kWp (größer 0, höchstens 1000), `None` = nicht senden |
| `PV_PROGNOSE_DATEI` | – | Dateiname der PV-Tagesprognose relativ zum Script-Verzeichnis, Standard `"pv_tagesprognose.json"`, `""` = nicht verwenden |
| `SMARTMETER_MODEL` | – | Freie Bezeichnung des Zählers, höchstens 120 Zeichen |
| `MAX_ALTER_S` | – | Maximales Alter eines Messwerts in Sekunden, Standard `600` |
| `API_URL` | – | Endpunkt der Ortsnetz-Auslastung-API |
| `INTEGRATION_VERSION` | – | Kennung dieser Integration |

Zahlen werden mit Punkt als Dezimaltrennzeichen und ohne Anführungszeichen eingetragen.

## PV-Tagesprognose

Liegt im Script-Verzeichnis eine Datei `pv_tagesprognose.json`, wird ihr Wert als `pv_forecast_kwh` übertragen:

```json
{"datum": "2026-09-29", "pv_forecast_kwh": 23.4}
```

- `datum`: Kalendertag der Prognose im Format `JJJJ-MM-TT` (lokale Zeit)
- `pv_forecast_kwh`: prognostizierte PV-Erzeugung für den gesamten Tag in kWh (0 bis 100000)

Der Wert wird nur gesendet, wenn `datum` dem heutigen Tag entspricht. Fehlt die Datei, bleibt das Feld ohne Meldung weg. Eine veraltete oder fehlerhafte Datei wird im Log vermerkt.

Das erzeugende Script schreibt die Datei atomar über eine temporäre Datei im selben Verzeichnis, zum Beispiel in Python:

```python
import json
import os
import tempfile
from datetime import date


def prognose_schreiben(kwh, pfad="/opt/ortsnetz-auslastung/pv_tagesprognose.json"):
	daten = {"datum": date.today().isoformat(), "pv_forecast_kwh": round(kwh, 2)}
	fd, tmp = tempfile.mkstemp(dir=os.path.dirname(pfad))
	with os.fdopen(fd, "w") as datei:
		json.dump(daten, datei)
	os.chmod(tmp, 0o644)
	os.replace(tmp, pfad)
```

oder in der Shell:

```bash
printf '{"datum": "%s", "pv_forecast_kwh": %s}\n' "$(date +%F)" "$KWH" > /opt/ortsnetz-auslastung/pv_tagesprognose.json.tmp \
	&& mv /opt/ortsnetz-auslastung/pv_tagesprognose.json.tmp /opt/ortsnetz-auslastung/pv_tagesprognose.json
```

## Test

```bash
/opt/ortsnetz-auslastung/ortsnetz_auslastung.py --dry-run
```

Mit `--dry-run` werden die Werte abgerufen, geprüft und als Payload ausgegeben, aber nicht gesendet:

```json
{
	"observed_at": "2026-09-29T06:03:12Z",
	"latitude": 49.87,
	"longitude": 8.65,
	"l1_v": 231.4,
	"l2_v": 230.8,
	"l3_v": 232.1,
	"integration_version": "volkszaehler-py-1.0",
	"grid_frequency_hz": 49.98,
	"plant_capacity_kwp": 9.8,
	"pv_forecast_kwh": 23.4
}
```

Die Middleware-Antwort lässt sich direkt prüfen mit:

```bash
curl "http://localhost:8080/data.json?uuid[]=<UUID_L1>&from=$(( ($(date +%s)-600)*1000 ))&to=$(( $(date +%s)*1000 ))"
```

## Betrieb per cron

```bash
crontab -e
```

```
3-59/5 * * * * /usr/bin/python3 /opt/ortsnetz-auslastung/ortsnetz_auslastung.py >> $HOME/ortsnetz-auslastung.log 2>&1
```

Das Script läuft alle fünf Minuten, jeweils in Minute 3, 8, 13 … 58. Der Versatz zur vollen Fünf-Minuten-Marke verteilt die Last und gibt Volkszähler Zeit, frische Werte zu schreiben.

## Log und Fehler

Bei erfolgreicher Übertragung erscheint eine Zeile mit den Messwerten und dem Ampelstatus aus der API-Antwort:

```
2026-09-29 06:03:13 Übertragen (2026-09-29T06:03:12Z): L1=231.4 L2=230.8 L3=232.1 f=49.98 PV-Prognose=23.4 kWh | Ampel: l1=… l2=… l3=… overall=…
```

Bei Fehlern endet das Script mit Exit-Code 1 und einer Meldung, die mit `FEHLER:` beginnt:

| Meldung | Ursache |
|---|---|
| `… ist nicht gesetzt` / `… müssen gesetzt sein` | Pflichtwert in der Konfiguration fehlt |
| `Abruf von … fehlgeschlagen` | Middleware nicht erreichbar oder Antwort kein gültiges JSON |
| `keine Messwerte der letzten … s` | Kanal liefert im Zeitfenster keine Daten, vzlogger oder Zähler prüfen |
| `… außerhalb des gültigen Bereichs` | Unplausibler Messwert |
| `403` | Der Standort ist für die Annahme gesperrt |
| `422` | Payload von der API abgelehnt, die Antwort nennt das betroffene Feld |

## Weitere Informationen

- API-Beschreibung und weitere Integrationen: [datenerfassung-ortsnetz-auslastung](https://github.com/thomaslehmann1234/datenerfassung-ortsnetz-auslastung)
- Volkszähler: [volkszaehler.org](https://volkszaehler.org)
