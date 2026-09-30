#!/usr/bin/env python3
"""
ortsnetz_auslastung.py

Liest die Phasenspannungen (und optional die Netzfrequenz) aus der
Volkszähler-Middleware per lokalem HTTP und sendet sie an https://www.ortsnetz-auslastung.de

Nur Python-Standardbibliothek, ab Python 3.8.
Jeder Aufruf führt genau eine Messung und Übertragung aus.

Aufruf:
	ortsnetz_auslastung.py            -> abrufen und senden
	ortsnetz_auslastung.py --dry-run  -> abrufen und Payload nur ausgeben

Crontab (alle 5 Minuten):
	3-59/5 * * * * /usr/bin/python3 /opt/ortsnetz-auslastung/ortsnetz_auslastung.py >> $HOME/ortsnetz-auslastung.log 2>&1
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone

# ============================ Konfiguration ============================

# Host und Port der Volkszähler-Middleware
VZ_HOST_PORT = "localhost:8080"

# Kanal-UUIDs der Spannungen; UUID_L2 und UUID_L3 leer lassen bei einphasiger Messung
UUID_L1 = ""
UUID_L2 = ""
UUID_L3 = ""

# Optional: Kanal-UUID der Netzfrequenz (leer = wird nicht übertragen)
UUID_FREQUENZ = ""

# Ungefährer Standort in Dezimalgrad
LATITUDE = None		# z. B. 49.87
LONGITUDE = None	# z. B. 8.65

# Optional: installierte PV-Leistung in kWp, größer 0 und maximal 1000 (None = wird nicht übertragen)
PLANT_CAPACITY_KWP = None	# z. B. 9.8

# Optional: Datei mit der heutigen PV-Tagesprognose, relativ zum Verzeichnis dieses Scripts
# Inhalt: {"datum": "JJJJ-MM-TT", "pv_forecast_kwh": 23.4}
# Fehlt die Datei oder stammt sie nicht von heute, wird keine Prognose übertragen ("" = nicht verwenden)
PV_PROGNOSE_DATEI = "pv_tagesprognose.json"

# Optional: freie Bezeichnung des Zählers, maximal 120 Zeichen
SMARTMETER_MODEL = ""

# Messwerte, die älter als diese Anzahl Sekunden sind, werden verworfen
MAX_ALTER_S = 600

API_URL = "https://www.ortsnetz-auslastung.de/v1/measurements"
INTEGRATION_VERSION = "volkszaehler-py-1.0"

# =======================================================================


class MesswertFehler(Exception):
	pass


def log(text):
	zeit = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
	print(f"{zeit} {text}", flush=True)


def json_holen(url):
	try:
		with urllib.request.urlopen(url, timeout=10) as antwort:
			return json.load(antwort)
	except (urllib.error.URLError, OSError, json.JSONDecodeError) as fehler:
		raise MesswertFehler(f"Abruf von {url} fehlgeschlagen: {fehler}")


def tupel_holen():
	"""Fragt alle Kanäle in einer Anfrage ab und liefert {uuid: letztes_tupel}."""
	uuids = [u for u in (UUID_L1, UUID_L2, UUID_L3, UUID_FREQUENZ) if u]
	endstamp = int(time.time() * 1000)
	beginstamp = endstamp - MAX_ALTER_S * 1000
	parameter = [("uuid[]", u) for u in uuids] + [("from", beginstamp), ("to", endstamp)]
	url = "http://" + VZ_HOST_PORT + "/data.json?" + urllib.parse.urlencode(parameter)

	daten = json_holen(url).get("data") or []
	if isinstance(daten, dict):
		daten = [daten]

	ergebnis = {}
	for kanal in daten:
		tupel = kanal.get("tuples") or []
		if kanal.get("uuid") and tupel:
			ergebnis[kanal["uuid"]] = (float(tupel[-1][0]), float(tupel[-1][1]))
	return ergebnis


def messwert(tupel, name, uuid, minimum, maximum):
	"""Liefert (zeitstempel_ms, wert), wenn der Wert vorhanden, aktuell und im Bereich ]minimum, maximum] ist."""
	if uuid not in tupel:
		raise MesswertFehler(f"{name}: keine Messwerte der letzten {MAX_ALTER_S} s (UUID {uuid}).")
	zeitstempel_ms, wert = tupel[uuid]

	alter_s = time.time() - zeitstempel_ms / 1000
	if alter_s > MAX_ALTER_S:
		raise MesswertFehler(f"{name}: letzter Wert ist {alter_s:.0f} s alt und wird verworfen.")
	if not minimum < wert <= maximum:
		raise MesswertFehler(f"{name}: Wert {wert} liegt außerhalb des gültigen Bereichs.")

	return zeitstempel_ms, round(wert, 2)


def pv_prognose_lesen():
	"""Liefert die heutige PV-Tagesprognose in kWh oder None."""
	if not PV_PROGNOSE_DATEI:
		return None
	pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), PV_PROGNOSE_DATEI)
	if not os.path.exists(pfad):
		return None

	try:
		with open(pfad, encoding="utf-8") as datei:
			daten = json.load(datei)
		datum = daten["datum"]
		kwh = float(daten["pv_forecast_kwh"])
	except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as fehler:
		log(f"PV-Prognose in {pfad} nicht lesbar ({fehler}) und wird nicht übertragen.")
		return None

	if datum != date.today().isoformat():
		log(f"PV-Prognose stammt vom {datum} und wird nicht übertragen.")
		return None
	if not 0 <= kwh <= 100000:
		log(f"PV-Prognose {kwh} kWh liegt außerhalb des gültigen Bereichs und wird nicht übertragen.")
		return None

	return round(kwh, 2)


def konfiguration_pruefen():
	if not UUID_L1:
		raise SystemExit("FEHLER: UUID_L1 ist nicht gesetzt.")
	if LATITUDE is None or LONGITUDE is None:
		raise SystemExit("FEHLER: LATITUDE und LONGITUDE müssen gesetzt sein.")
	if bool(UUID_L2) != bool(UUID_L3):
		raise SystemExit("FEHLER: UUID_L2 und UUID_L3 müssen beide gesetzt oder beide leer sein.")
	if PLANT_CAPACITY_KWP is not None and not 0 < PLANT_CAPACITY_KWP <= 1000:
		raise SystemExit("FEHLER: PLANT_CAPACITY_KWP muss größer 0 und maximal 1000 sein.")


def payload_erstellen():
	tupel = tupel_holen()
	zeitstempel_ms, l1 = messwert(tupel, "L1", UUID_L1, 0, 500)

	if UUID_L2:
		_, l2 = messwert(tupel, "L2", UUID_L2, 0, 500)
		_, l3 = messwert(tupel, "L3", UUID_L3, 0, 500)
	else:
		l2 = l3 = -1

	observed_at = datetime.fromtimestamp(zeitstempel_ms / 1000, tz=timezone.utc)
	payload = {
		"observed_at": observed_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
		"latitude": LATITUDE,
		"longitude": LONGITUDE,
		"l1_v": l1,
		"l2_v": l2,
		"l3_v": l3,
		"integration_version": INTEGRATION_VERSION,
	}

	if UUID_FREQUENZ:
		try:
			_, payload["grid_frequency_hz"] = messwert(tupel, "Frequenz", UUID_FREQUENZ, 45, 55)
		except MesswertFehler as fehler:
			log(f"{fehler} Frequenz wird in dieser Messung nicht übertragen.")

	if PLANT_CAPACITY_KWP is not None:
		payload["plant_capacity_kwp"] = PLANT_CAPACITY_KWP

	pv_prognose = pv_prognose_lesen()
	if pv_prognose is not None:
		payload["pv_forecast_kwh"] = pv_prognose

	if SMARTMETER_MODEL:
		payload["smartmeter_model"] = SMARTMETER_MODEL[:120]

	return payload


def senden(payload):
	anfrage = urllib.request.Request(
		API_URL,
		data=json.dumps(payload).encode("utf-8"),
		headers={"Content-Type": "application/json"},
		method="POST",
	)
	try:
		with urllib.request.urlopen(anfrage, timeout=20) as antwort:
			status_code = antwort.status
			text = antwort.read().decode("utf-8", errors="replace")
	except urllib.error.HTTPError as fehler:
		status_code = fehler.code
		text = fehler.read().decode("utf-8", errors="replace")
	except (urllib.error.URLError, OSError) as fehler:
		raise SystemExit(f"FEHLER: Verbindung zur API fehlgeschlagen: {fehler}")

	if status_code == 202:
		try:
			ampel = json.loads(text).get("status", {})
			ampel_text = " ".join(f"{k}={v}" for k, v in ampel.items())
		except (json.JSONDecodeError, AttributeError):
			ampel_text = "unbekannt"
		werte = f"L1={payload['l1_v']} L2={payload['l2_v']} L3={payload['l3_v']}"
		if "grid_frequency_hz" in payload:
			werte += f" f={payload['grid_frequency_hz']}"
		if "pv_forecast_kwh" in payload:
			werte += f" PV-Prognose={payload['pv_forecast_kwh']} kWh"
		log(f"Übertragen ({payload['observed_at']}): {werte} | Ampel: {ampel_text}")
	elif status_code == 403:
		raise SystemExit("FEHLER: 403 – der Standort ist für die Annahme gesperrt.")
	elif status_code == 422:
		raise SystemExit(f"FEHLER: 422 – Payload abgelehnt: {text}")
	else:
		raise SystemExit(f"FEHLER: HTTP {status_code}: {text}")


def main():
	konfiguration_pruefen()
	try:
		payload = payload_erstellen()
	except MesswertFehler as fehler:
		raise SystemExit(f"FEHLER: {fehler}")

	if "--dry-run" in sys.argv[1:]:
		print(json.dumps(payload, indent="\t", ensure_ascii=False))
		return

	senden(payload)


if __name__ == "__main__":
	main()
