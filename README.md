# Datenerfassung für Ortsnetz-Auslastung

Dieses Repository bündelt Integrationen, die lokale Netzspannungsmessungen an die Ortsnetz-Auslastung-API senden. Sie übertragen Spannungswerte, einen Zeitstempel und einen ungefähren Standort. Es ist kein API-Schlüssel erforderlich.

## Schnellnavigation

- [Shelly Pro 3EM und Pro EM50](#shelly-pro-3em-und-pro-em50)
- [Tasmota SML-Lesekopf](#tasmota-sml-lesekopf)
- [Home Assistant](#home-assistant)
- [ioBroker](#iobroker)
- [MQTT](#mqtt)
- [Victron GX](#victron-gx)
- [KOSTAL KSEM](#kostal-ksem)
- [openHAB](#openhab)
- [Gemeinsame Eigenschaften](#gemeinsame-eigenschaften)
- [API](#api)

## Integrationen

| Integration | Datenquelle | Laufzeit | Übertragung | Geeignet für |
| --- | --- | --- | --- | --- |
| [Shelly Pro 3EM und Pro EM50](#shelly-pro-3em-und-pro-em50) | Direkte Spannungsmessung | Shelly Script | HTTPS | Shelly-Installationen |
| [Tasmota SML-Lesekopf](#tasmota-sml-lesekopf) | Optische Smart-Meter-Schnittstelle | ESP32 / Tasmota Script | HTTPS / WebQuery | SML-fähige Stromzähler |
| [Home Assistant](#home-assistant) | Vorhandene Spannungssensoren | Home Assistant / HACS | HTTPS | Home-Assistant-Installationen |
| [ioBroker](#iobroker) | Vorhandene Spannungsdatenpunkte | ioBroker JavaScript | HTTPS | ioBroker-Installationen |
| [MQTT](#mqtt) | MQTT-Topics | Node.js / Docker | HTTPS | Smart-Meter-Gateways mit MQTT und EVCC |
| [Victron GX](#victron-gx) | VE.Bus oder Netzzähler über D-Bus | Python / Venus OS | HTTPS | Victron GX-Geräte |
| [KOSTAL KSEM](#kostal-ksem) | KOSTAL Smart Energy Meter | Node-RED / Modbus | HTTPS | KSEM mit Node-RED |
| [openHAB](#openhab) | Vorhandene Smart-Meter-Items | openHAB JavaScript-Regel | HTTPS | openHAB-Installationen |

## Shelly Pro 3EM und Pro EM50

Skripte für Shelly Pro 3EM, Pro 3EM-400 und Pro EM50. Sie senden sofort nach dem Start und danach alle fünf Minuten. Der einphasige Pro EM50 kennzeichnet nicht vorhandene L2/L3-Phasen mit `-1`; die API akzeptiert diese Werte.

- Ordner: [`shelly-ortsnetz-auslastung`](shelly-ortsnetz-auslastung)
- Voraussetzungen: unterstütztes Shelly-Gerät, Shelly Scripting, NTP und Internetzugang
- Skripte: [`pro-3EM-ortsnetz-auslastung.js`](shelly-ortsnetz-auslastung/pro-3EM-ortsnetz-auslastung.js) und [`pro-EM50-ortsnetz-auslastung.js`](shelly-ortsnetz-auslastung/pro-EM50-ortsnetz-auslastung.js)

Vor dem Aktivieren Breitengrad und Längengrad konfigurieren.

## Tasmota SML-Lesekopf

Ein ESP32 mit optischem Lesekopf dekodiert SML-Telegramme des Stromzählers und sendet L1, L2, L3 sowie optional die Frequenz per WebQuery.

- Ordner: [`tasmota-ortsnetz-auslastung`](tasmota-ortsnetz-auslastung)
- Voraussetzungen: ESP32 für HTTPS, Tasmota mit `USE_SCRIPT` und `USE_SML_M` sowie eine freigeschaltete Info-Schnittstelle des Zählers

GPIO, Baudrate und OBIS-Codes hängen vom Zählermodell ab.

## Home Assistant

Die HACS-Integration überträgt drei ausgewählte Spannungssensoren sowie optional Frequenz- und PV-Daten.

- Repository: [ha_ortsnetz_auslastung](https://github.com/thomaslehmann1234/ha_ortsnetz_auslastung)
- Voraussetzungen: Home Assistant und HACS

## ioBroker

Das Script für den JavaScript-Adapter liest drei konfigurierte Spannungsdatenpunkte und optional die Frequenz.

- Ordner: [`iobroker-ortsnetz-auslastung`](iobroker-ortsnetz-auslastung)
- Voraussetzung: `ioBroker.javascript` ab Version 7.9

Das Script verwendet den eingebauten Helfer `httpPost` und benötigt keine zusätzliche npm-Abhängigkeit.

## MQTT

Ein eigenständiges Node.js-Script abonniert drei Spannungs-Topics und optional ein Frequenz-Topic auf einem MQTT-Broker. Es unterstützt außerdem eine PV-Tagesprognose, zum Beispiel von evcc, und überträgt die Messwerte nach einem ersten Upload alle fünf Minuten per HTTPS.

- Ordner: lokal `mqtt-ortsnetz-auslastung`
- Messquelle: Smart-Meter-Gateways oder andere Systeme mit MQTT-Topics für L1/L2/L3
- Voraussetzung: Node.js ab Version 24 oder Docker, erreichbarer MQTT-Broker und Internetzugang

Die Konfiguration erfolgt im `CONFIG`-Block des Scripts. Unterstützt werden numerische Payloads sowie JSON-Payloads mit konfigurierbarem Schlüssel. Details stehen in der [MQTT-README](mqtt-ortsnetz-auslastung/README.md).

## Victron GX

Das Python-Script läuft direkt auf Venus OS und liest Netzspannungen über den lokalen D-Bus. Es bevorzugt den Victron-Netzzähler und verwendet andernfalls VE.Bus.

- Ordner: [`victron-gx-ortsnetz-auslastung`](victron-gx-ortsnetz-auslastung)
- Script: [`ortsnetz-victron-gx.py`](victron-gx-ortsnetz-auslastung/ortsnetz-victron-gx.py)
- Voraussetzungen: Victron GX mit Venus OS, VE.Bus-Gerät oder Netzzähler, SSH-Zugang und Internetzugang

Installation, Konfiguration und Autostart stehen in der [Victron-GX-README](victron-gx-ortsnetz-auslastung/README.md).

## KOSTAL KSEM

Die KSEM-Integration ist ein importierbarer Node-RED-Flow. Sie liest L1, L2, L3 und Frequenz über Modbus, baut den API-Payload und wertet die API-Antwort aus.

- Ordner: [`kesm-ortsnetz-auslastung`](kesm-ortsnetz-auslastung)
- Flow: [`kesm.js`](kesm-ortsnetz-auslastung/kesm.js)
- Voraussetzungen: Node-RED mit Modbus- und buffer-parser-Nodes sowie Modbus-Zugriff auf den KSEM

Vor der Bereitstellung Modbus-Server und Beispielkoordinaten in der Payload-Funktion anpassen. Der mitgelieferte Flow liest und sendet alle fünf Minuten.

## openHAB

Die openHAB-Integration besteht aus einer JavaScript-Regel und einem Node.js-HTTPS-Helfer. Die Regel liest konfigurierte Smart-Meter-Items alle fünf Minuten und ruft den Helfer auf.

- Ordner: [`openhab-ortsnetz-auslastung`](openhab-ortsnetz-auslastung)
- Regel: [`ortsnetz-auslastung.js`](openhab-ortsnetz-auslastung/ortsnetz-auslastung.js)
- Helfer: [`ortsnetz_senden.js`](openhab-ortsnetz-auslastung/ortsnetz_senden.js)
- Voraussetzungen: openHAB JavaScript Scripting sowie Node.js unter dem konfigurierten Helferpfad

Vor der Aktivierung Item-IDs sowie Node.js- und Helferpfade anpassen.

## Gemeinsame Eigenschaften

- Übertragungsintervall: integrationsabhängig, die meisten Skripte verwenden fünf Minuten
- Pflichtfelder: Zeitstempel, Standort und Spannungswerte; einphasige Messungen verwenden für nicht vorhandene L2/L3-Phasen `-1`
- Optionale Felder: Netzfrequenz, PV-Leistung und PV-Prognose
- Keine Übertragung von Zählernummern, Gerätekennungen, Energiezählern oder IP-Adressen

## API

Die vollständige Request- und Response-Referenz steht in [API.md](API.md).

```text
POST https://www.ortsnetz-auslastung.de/v1/measurements
Content-Type: application/json
```

Bei erfolgreicher Annahme liefert der Service `202 Accepted`.

## Koordinaten

Koordinaten lassen sich über [OpenStreetMap](https://www.openstreetmap.org/) bestimmen: Ort suchen, mit der rechten Maustaste auf die Karte klicken und **„Abfrage starten“** auswählen.
