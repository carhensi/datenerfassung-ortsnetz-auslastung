# Ortsnetz-Auslastung für ioBroker

Ein kompaktes Script für den ioBroker-JavaScript-Adapter. Es liest drei vorhandene Spannungs-Datenpunkte sowie optional Netzfrequenz und PV-Prognose. Die Werte werden alle fünf Minuten direkt per HTTPS an die Ortsnetz-Auslastung-API übertragen.

Es ist kein eigener ioBroker-Adapter und kein zusätzlicher Dienst notwendig.

## Voraussetzungen

- ioBroker mit installiertem Adapter **JavaScript** ab Version 7.9.0
- Drei numerische Datenpunkte mit L1-, L2- und L3-Spannung in Volt, zum Beispiel aus einem Smart-Meter-, Modbus- oder Shelly-Adapter
- Internetzugang des ioBroker-Hosts

## Installation

1. Im ioBroker-Admin **Skripte** öffnen und ein neues JavaScript-Script erstellen.
2. Den Inhalt von [ortsnetz-auslastung.js](ortsnetz-auslastung.js) einfügen.
3. Im `CONFIG`-Block `latitude`, `longitude` und die drei Datenpunkt-IDs anpassen. Die IDs lassen sich im ioBroker-Admin unter **Objekte** kopieren.
4. Optional `frequencyState`, `plantCapacityKwp`, `pvForecastState` und `smartmeterModel` konfigurieren. Für nicht vorhandene Datenpunkte jeweils `''` eintragen.
5. Script aktivieren. Es führt sofort einen ersten Upload aus und danach alle fünf Minuten.

Koordinaten lassen sich mit [OpenStreetMap](https://www.openstreetmap.org/) bestimmen: Standort suchen, Rechtsklick auf die Karte und **„Abfrage starten“** wählen.

## Beispielkonfiguration

```javascript
const CONFIG = {
    latitude: 52.520008,
    longitude: 13.404954,
    l1State: 'shelly.0.ShellyPro3EM#ABCDEF.emeter.0.voltage',
    l2State: 'shelly.0.ShellyPro3EM#ABCDEF.emeter.1.voltage',
    l3State: 'shelly.0.ShellyPro3EM#ABCDEF.emeter.2.voltage',
    frequencyState: 'shelly.0.ShellyPro3EM#ABCDEF.emeter.0.frequency',
    plantCapacityKwp: 10.0,
    pvForecastState: 'forecast.0.today_kwh',
    smartmeterModel: 'Shelly Pro 3EM',
};
```

Die Datenpunktnamen variieren je Adapter und Gerät. `plantCapacityKwp` ist ein fester Wert in kWp, `pvForecastState` ein Datenpunkt in kWh. Geräte-ID und Zählernummer werden nicht übertragen.

## Verhalten und Fehleranalyse

- Spannungswerte außerhalb von 150–300 V werden nicht übertragen.
- Die Frequenz wird nur gesendet, wenn sie zwischen 45 und 55 Hz liegt.
- Die PV-Anlagengröße wird nur zwischen 0 und 1000 kWp gesendet; die PV-Prognose nur zwischen 0 und 100000 kWh.
- Übertragungen erhalten eine Zeitüberschreitung von 10 Sekunden und blockieren keinen folgenden Intervalllauf.
- Warnungen stehen im ioBroker-Log unter `Ortsnetz-Auslastung`.
- Bei `Datenpunkt nicht lesbar` die IDs im `CONFIG`-Block prüfen.

## API

```text
POST https://www.ortsnetz-auslastung.de/v1/measurements
Content-Type: application/json
```

Beispiel-Payload:

```json
{
  "observed_at": "2026-09-15T08:00:00.000Z",
  "latitude": 52.520008,
  "longitude": 13.404954,
  "l1_v": 230.1,
  "l2_v": 229.9,
  "l3_v": 230.4,
  "grid_frequency_hz": 50,
  "plant_capacity_kwp": 10.0,
  "pv_forecast_kwh": 24.5,
  "smartmeter_model": "Shelly Pro 3EM",
  "integration_version": "iobroker-0.2.0"
}
```

Die API bestätigt angenommene Messungen mit HTTP `202`.

## Quelle

- [ioBroker JavaScript: httpPost](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md)
