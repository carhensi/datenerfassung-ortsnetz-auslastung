# Fronius → Ortsnetz-Auslastung

Python-Script, das die Phasenspannungen und die Netzfrequenz eines Fronius Smart Meters über die lokale Fronius Solar API des Wechselrichters liest und an [ortsnetz-auslastung.de](https://www.ortsnetz-auslastung.de) überträgt. Optional wird die installierte PV-Leistung mitgesendet.

Das Script wird per cron gestartet und führt pro Aufruf genau eine Messung und Übertragung aus.

## Funktionsweise

1. Die Zählerdaten werden mit einer Anfrage an den Wechselrichter abgefragt:
```
	http://<FRONIUS_HOST>:<FRONIUS_PORT>/solar_api/v1/GetMeterRealtimeData.cgi?Scope=System
```
2. Aus allen gemeldeten Zählern wird der Smart Meter am Netzeinspeisepunkt verwendet (`Meter_Location_Current` = `0`). Zähler im Verbrauchszweig oder an Subverbrauchern werden ignoriert.
3. Die Werte werden geprüft:
	- Spannungen `Voltage_AC_Phase_1` bis `_3`: größer 0 V und höchstens 500 V
	- Netzfrequenz `Frequency_Phase_Average`: 45 Hz bis 55 Hz
	- Zeitstempel `TimeStamp` des Zählers: höchstens `MAX_ABWEICHUNG_S` Sekunden Abweichung von der Systemzeit
4. Der Zeitstempel des Zählers wird als `observed_at` (UTC) übernommen, das Zählermodell aus `Details.Model` als `smartmeter_model`.
5. Die Messung wird per `POST` an `https://www.ortsnetz-auslastung.de/v1/measurements` gesendet. Die Antwort der API wird ins Log geschrieben.

Fehlt die L1-Spannung oder ist sie ungültig, wird nichts gesendet. Liefert der Zähler weder für L2 noch für L3 gültige Werte, zum Beispiel ein einphasiger Smart Meter, werden L2 und L3 mit `-1` übertragen. Ist nur eine der beiden Phasen ungültig, wird ebenfalls nichts gesendet. Eine fehlende oder ungültige Netzfrequenz wird weggelassen, die Messung geht trotzdem raus.

## Voraussetzungen

- Fronius-Wechselrichter mit Fronius Smart Meter am Netzeinspeisepunkt, zum Beispiel Smart Meter TS 5kA-3, TS 65A-3 oder 63A-3
- Aktivierte Solar API am Wechselrichter (siehe unten)
- Linux-Rechner im selben Netz, zum Beispiel ein Raspberry Pi, mit cron und Internetzugang
- Python ab 3.8 (nur Standardbibliothek, keine zusätzlichen Pakete)

## Solar API aktivieren

- **Fronius GEN24 / GEN24 Plus und Tauro**: Im Webinterface des Wechselrichters unter **Kommunikation → Solar API** die Option **Kommunikation über Solar API aktivieren** einschalten und speichern. Bei diesen Geräten ist die Solar API ab Werk deaktiviert.
- **Fronius Symo, Primo, Galvo und Eco mit Datamanager**: Die Solar API ist meist schon aktiv und muss nicht eingeschaltet werden.

Die Solar API benötigt keine Anmeldung. Sie ist nur im lokalen Netz erreichbar und sollte nicht ins Internet freigegeben werden.

### Test im Browser

Im Browser aufrufen, IP-Adresse des Wechselrichters einsetzen:

```
http://<IP-des-Wechselrichters>/solar_api/v1/GetMeterRealtimeData.cgi?Scope=System
```

Die Antwort enthält unter `Body.Data` je Zähler einen Eintrag. Für das Script sind diese Felder relevant (gekürzt):

```json
{
	"Body": {
		"Data": {
			"0": {
				"Details": {
					"Manufacturer": "Fronius",
					"Model": "Smart Meter TS 5kA-3"
				},
				"Frequency_Phase_Average": 50.0,
				"Meter_Location_Current": 0,
				"TimeStamp": 1790841600,
				"Voltage_AC_Phase_1": 227.7,
				"Voltage_AC_Phase_2": 227.6,
				"Voltage_AC_Phase_3": 228.5
			}
		}
	},
	"Head": {
		"Status": {
			"Code": 0
		}
	}
}
```

Erscheint keine Antwort oder eine Fehlerseite, ist die Solar API nicht aktiv oder die Adresse falsch. Ist `Body.Data` leer, erkennt der Wechselrichter keinen Smart Meter.

## Installation

```bash
sudo mkdir /opt/ortsnetz-fronius
sudo chown $USER: /opt/ortsnetz-fronius
cp ortsnetz_fronius.py /opt/ortsnetz-fronius/
chmod 755 /opt/ortsnetz-fronius/ortsnetz_fronius.py
```

## Konfiguration

Die Konfiguration steht im Block am Anfang von `ortsnetz_fronius.py` oder wird per Environment-Variablen gesetzt (siehe unten).

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `FRONIUS_HOST` | ja | IP-Adresse oder Hostname des Wechselrichters. Ist er nicht gesetzt, bricht das Script ab |
| `FRONIUS_PORT` | ja | Port des Webinterfaces, Standard `80` |
| `LATITUDE`, `LONGITUDE` | ja | Ungefährer Standort in Dezimalgrad, z. B. `52.52` und `13.40`. Sind sie nicht gesetzt, bricht das Script ab |
| `PLANT_CAPACITY_KWP` | – | Installierte PV-Leistung in kWp (größer 0, höchstens 1000), `None` = nicht senden |
| `MAX_ABWEICHUNG_S` | – | Maximale Abweichung des Zähler-Zeitstempels von der Systemzeit in Sekunden, Standard `600` |
| `API_URL` | – | Endpunkt der Ortsnetz-Auslastung-API |
| `INTEGRATION_VERSION` | – | Kennung dieser Integration |

Zahlen werden mit Punkt als Dezimaltrennzeichen und ohne Anführungszeichen eingetragen. Das Zählermodell wird automatisch aus der Solar API übernommen.

### Konfiguration per Environment-Variablen

`FRONIUS_HOST`, `FRONIUS_PORT`, `LATITUDE`, `LONGITUDE` und `PLANT_CAPACITY_KWP` können statt im Script auch als gleichnamige Environment-Variablen gesetzt werden. Gesetzte Variablen haben Vorrang vor den Werten im Script, leere Variablen werden ignoriert. So bleibt das Script unverändert und lässt sich bei einem Update einfach ersetzen.

```bash
FRONIUS_HOST=<IP-des-Wechselrichters> LATITUDE=52.52 LONGITUDE=13.40 PLANT_CAPACITY_KWP=9.8 /opt/ortsnetz-fronius/ortsnetz_fronius.py --dry-run
```

Ein ungültiger Wert, zum Beispiel `LATITUDE=abc`, führt zum Abbruch mit einer Fehlermeldung.

## Test

```bash
/opt/ortsnetz-fronius/ortsnetz_fronius.py --dry-run
```

Mit `--dry-run` werden die Werte abgerufen, geprüft und als Payload ausgegeben, aber nicht gesendet:

```json
{
	"observed_at": "2026-10-01T08:00:00Z",
	"latitude": 52.52,
	"longitude": 13.4,
	"l1_v": 227.7,
	"l2_v": 227.6,
	"l3_v": 228.5,
	"integration_version": "fronius-0.1.0",
	"grid_frequency_hz": 50.0,
	"plant_capacity_kwp": 9.8,
	"smartmeter_model": "Smart Meter TS 5kA-3"
}
```

## Betrieb per cron

```bash
crontab -e
```

```
*/5 * * * * /usr/bin/python3 /opt/ortsnetz-fronius/ortsnetz_fronius.py >> $HOME/ortsnetz-fronius.log 2>&1
```

Das Script läuft alle fünf Minuten.

Mit Konfiguration per Environment-Variablen werden die Variablen vor den Aufruf gesetzt:

```
*/5 * * * * FRONIUS_HOST=<IP-des-Wechselrichters> LATITUDE=52.52 LONGITUDE=13.40 /usr/bin/python3 /opt/ortsnetz-fronius/ortsnetz_fronius.py >> $HOME/ortsnetz-fronius.log 2>&1
```

Alternativ stehen die Variablen als eigene Zeilen über dem Eintrag in der Crontab, zum Beispiel `LATITUDE=52.52`. Sie gelten dann für alle folgenden Einträge.

## Übertragene Daten

Übertragen werden nur:

- Zeitstempel der Messung
- Breiten- und Längengrad aus der Konfiguration
- Spannungen L1, L2 und L3 sowie die Netzfrequenz
- Zählermodell aus `Details.Model`, zum Beispiel `Smart Meter TS 5kA-3`
- Kennung der Integration
- optional die installierte PV-Leistung aus der Konfiguration

Nicht übertragen werden insbesondere:

- Seriennummern von Zähler und Wechselrichter (`Details.Serial`)
- Energiezählerstände (`EnergyReal_*`, `EnergyReactive_*`)
- Ströme und Leistungen
- IP-Adresse und Port des Wechselrichters
- Daten weiterer Zähler, die nicht am Netzeinspeisepunkt sitzen

## Log und Fehler

Bei erfolgreicher Übertragung erscheint eine Zeile mit den Messwerten und der Antwort der API:

```
2026-10-01 10:00:01 Übertragen (2026-10-01T08:00:00Z): L1=227.7 L2=227.6 L3=228.5 f=50.0 | HTTP 202: {"accepted":true,"created":true,"status":{"l1":"green","l2":"green","l3":"green","overall":"green"},"storage_recommendation":"none"}
```

Bei Fehlern endet das Script mit Exit-Code 1 und einer Meldung, die mit `FEHLER:` beginnt:

| Meldung | Ursache |
|---|---|
| `… ist nicht gesetzt` / `… müssen als Zahl gesetzt sein` / `… muss …` | Pflichtwert in der Konfiguration fehlt oder liegt außerhalb des gültigen Bereichs |
| `Environment-Variable … ist ungültig` | Eine Environment-Variable lässt sich nicht als Zahl lesen |
| `Abruf von … fehlgeschlagen` | Wechselrichter nicht erreichbar, Solar API nicht aktiv oder Antwort kein gültiges JSON |
| `Solar API meldet einen Fehler` | Der Wechselrichter hat die Anfrage mit einem Fehlercode beantwortet |
| `… keinen Smart Meter` | Am Wechselrichter ist kein Smart Meter erkannt |
| `Kein Smart Meter am Netzeinspeisepunkt` | Kein Zähler mit `Meter_Location_Current` = `0`, Einbauort des Smart Meters im Webinterface prüfen |
| `L1: keine gültige Spannung` | Der Zähler liefert keine plausible L1-Spannung |
| `L2/L3: nur eine Phase …` | Bei einem dreiphasigen Zähler fehlt eine Phase oder liefert einen unplausiblen Wert |
| `… ungültigen Zeitstempel` / `Zeitstempel … weicht … ab` | Uhrzeit von Wechselrichter oder System falsch, NTP prüfen |
| `403` | Der Standort ist für die Annahme gesperrt |
| `422` | Payload von der API abgelehnt, die Antwort nennt das betroffene Feld |

## Weitere Informationen

- API-Beschreibung und weitere Integrationen: [datenerfassung-ortsnetz-auslastung](https://github.com/thomaslehmann1234/datenerfassung-ortsnetz-auslastung)
