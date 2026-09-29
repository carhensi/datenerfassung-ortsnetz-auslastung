# Ortsnetz-Auslastung für openHAB

Die Integration besteht aus einer openHAB-JavaScript-Regel und einem Node.js-Helferscript. Sie liest Smart-Meter-Werte und sendet sie alle fünf Minuten an die Ortsnetz-Auslastung-API.

## Voraussetzungen

- openHAB mit JavaScript Scripting
- Node.js unter `/usr/bin/node`
- Drei Smart-Meter-Items für L1, L2 und L3 in Volt
- Ein Frequenz-Item in Hertz
- In den openHAB-Regional Settings hinterlegter Standort

## Dateien installieren

1. [`ortsnetz-auslastung.js`](ortsnetz-auslastung.js) nach `/srv/openhab-conf/automation/js/ortsnetz-auslastung.js` kopieren.
2. [`ortsnetz_senden.js`](ortsnetz_senden.js) nach `/srv/openhab-conf/misc/ortsnetz_senden.js` kopieren.
3. Leserechte für den openHAB-Prozess sicherstellen.

Die Regel startet das Helferscript mit `/usr/bin/node`. Bei einer anderen Node.js-Installation diesen Pfad in `ortsnetz-auslastung.js` anpassen.

## Benötigte Items

Die Namen im Regel-Script an die eigene Installation anpassen:

| Zweck | Standard-Item |
| --- | --- |
| Spannung L1 | `Smartmeter_L1_Volt` |
| Spannung L2 | `Smartmeter_L2_Volt` |
| Spannung L3 | `Smartmeter_L3_Volt` |
| Netzfrequenz | `Smartmeter_Frequenz` |
| PV-Anlagengröße, optional | `Smartmeter_PV_KWP` |
| PV-Prognose, optional | `Smartmeter_PV_Forecast` |

Für die Rückmeldung der API werden folgende String-Items erwartet:

```text
Ortsnetz_L1_Ampel
Ortsnetz_L2_Ampel
Ortsnetz_L3_Ampel
Ortsnetz_Overall_Ampel
Ortsnetz_API_Status
```

## Verhalten

- Intervall: alle fünf Minuten
- Standort: wird aus den openHAB-Regional Settings gelesen
- Daten: L1/L2/L3, Frequenz sowie optional PV-Leistung und PV-Prognose
- API-Antwort: aktualisiert die fünf Status-Items

Prüfe die openHAB-Logs, falls keine Übertragung erfolgt. Ein fehlendes Smart-Meter-Item oder `NULL`/`UNDEF` verhindert den Upload.

## Wichtig

Das Helferscript enthält Fallback-Werte für Spannung, Frequenz und Standort. Diese sind nur eine technische Reserve und dürfen nicht als Messwerte verwendet werden. Daher Standort und alle vier Pflicht-Items vor der Aktivierung korrekt konfigurieren.

## API

```text
POST https://www.ortsnetz-auslastung.de/v1/measurements
```

Die vollständige Feldbeschreibung steht in der übergeordneten [API-Dokumentation](../API.md).
