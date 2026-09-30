# Ortsnetz-Auslastung für Victron GX

Dieses Python-Script läuft direkt auf einem Victron-GX-Gerät mit Venus OS, zum Beispiel Cerbo GX. Es liest Netzspannungen und Frequenz über den lokalen D-Bus und sendet die Messung sofort nach dem Start und danach alle fünf Minuten an die Ortsnetz-Auslastung-API.

## Voraussetzungen

- Victron GX mit Venus OS und SSH-Zugang als `root`
- VE.Bus-Gerät (Multi/Quattro) oder Victron-Netzzähler
- Internetzugang des GX-Geräts
- Konfigurierte Koordinaten des Messorts

Das Script nutzt das auf Venus OS vorhandene Python-`dbus`-Modul; es sind keine zusätzlichen Python-Pakete erforderlich.

## Datenquellen

Das Script sucht in dieser Reihenfolge:

1. Netzzähler: `com.victronenergy.grid.*`, Pfade `/Ac/L1..L3/Voltage` und `/Ac/Frequency`
2. VE.Bus: `com.victronenergy.vebus.*`, Pfade `/Ac/ActiveIn/L1..L3/V` und `/Ac/ActiveIn/L1/F`

Ungültige oder nicht vorhandene L2/L3-Phasen werden mit `-1` übertragen. Das ist für einphasige Messungen vorgesehen. Fehlt oder ist L1 ungültig, wird kein Upload durchgeführt.

## Installation

1. Per SSH als `root` anmelden.
2. Zielordner anlegen und Script kopieren:

   ```sh
   mkdir -p /data/ortsnetz
   ```

   Das Script nach `/data/ortsnetz/ortsnetz-victron-gx.py` kopieren.

3. Im Konfigurationsblock des Scripts mindestens `LATITUDE` und `LONGITUDE` anpassen. `PLANT_KWP` und `PV_FORECAST_KWH` sind optional.
4. Einmalig testen:

   ```sh
   python3 /data/ortsnetz/ortsnetz-victron-gx.py --once
   ```

5. Autostart in `/data/rc.local` ergänzen:

   ```sh
   #!/bin/sh
   nohup python3 /data/ortsnetz/ortsnetz-victron-gx.py >> /data/ortsnetz/ortsnetz-victron-gx.log 2>&1 &
   ```

6. Datei ausführbar machen und GX neu starten:

   ```sh
   chmod +x /data/rc.local
   ```

Alle Dateien liegen unter `/data` und bleiben damit bei Venus-OS-Updates erhalten.

## Konfiguration

```python
LATITUDE = 52.520008
LONGITUDE = 13.404954
PLANT_KWP = 10.0          # optional
PV_FORECAST_KWH = None    # optional, z. B. 24.5
SMARTMETER_MODEL = "Victron GX"
INTERVAL_S = 300
```

Koordinaten lassen sich über [OpenStreetMap](https://www.openstreetmap.org/) bestimmen: Ort suchen, mit der rechten Maustaste auf die Karte klicken und **„Abfrage starten“** wählen.

## Fehleranalyse

- `Keine gültige L1-Spannung`: VE.Bus- oder Netzzählerdienst ist nicht verfügbar oder liefert keinen plausiblen L1-Wert.
- `HTTP ...`: Die API hat den Request abgelehnt; Antwort im Log prüfen.
- `Übertragung fehlgeschlagen`: Internetzugang, DNS und Systemzeit des GX-Geräts prüfen.

Das Log liegt bei obigem Autostart unter `/data/ortsnetz/ortsnetz-victron-gx.log`.
