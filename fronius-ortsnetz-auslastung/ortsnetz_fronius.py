#!/usr/bin/env python3
"""
ortsnetz_fronius.py

Liest die Phasenspannungen und die Netzfrequenz des Fronius Smart Meters am
Netzeinspeisepunkt über die lokale Solar API des Fronius-Wechselrichters und
sendet sie an https://www.ortsnetz-auslastung.de

Nur Python-Standardbibliothek, ab Python 3.8.
Jeder Aufruf führt genau eine Messung und Übertragung aus.

Aufruf:
	ortsnetz_fronius.py            -> abrufen und senden
	ortsnetz_fronius.py --dry-run  -> abrufen und Payload nur ausgeben

Crontab (alle 5 Minuten):
	*/5 * * * * /usr/bin/python3 /opt/ortsnetz-fronius/ortsnetz_fronius.py >> $HOME/ortsnetz-fronius.log 2>&1

Die Konfiguration kann statt im Konfigurationsblock auch per Environment-Variablen
erfolgen, siehe README.md.
"""

import http.client
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ============================ Konfiguration ============================

# FRONIUS_HOST, FRONIUS_PORT, LATITUDE, LONGITUDE und PLANT_CAPACITY_KWP können auch als
# gleichnamige Environment-Variablen gesetzt werden, diese haben Vorrang vor den Werten hier

# IP-Adresse oder Hostname des Fronius-Wechselrichters, muss gesetzt werden
FRONIUS_HOST = ""
# Port der Solar API, Standard 80
FRONIUS_PORT = 80

# Ungefährer Standort in Dezimalgrad, muss gesetzt werden
LATITUDE = None		# z. B. 52.52
LONGITUDE = None	# z. B. 13.40

# Optional: installierte PV-Leistung in kWp, größer 0 und maximal 1000 (None = wird nicht übertragen)
PLANT_CAPACITY_KWP = None	# z. B. 9.8

# Messwerte, deren Zeitstempel um mehr als diese Anzahl Sekunden von der Systemzeit abweicht, werden verworfen
MAX_ABWEICHUNG_S = 600

API_URL = "https://www.ortsnetz-auslastung.de/v1/measurements"
INTEGRATION_VERSION = "fronius-0.1.0"

# =======================================================================

# Meter_Location_Current des Zählers am Netzeinspeisepunkt
EINSPEISEPUNKT = 0


class MesswertFehler(Exception):
	pass


def log(text):
	zeit = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
	print(f"{zeit} {text}", flush=True)


def json_holen(url):
	try:
		with urllib.request.urlopen(url, timeout=10) as antwort:
			return json.load(antwort)
	except (urllib.error.URLError, OSError, http.client.HTTPException, ValueError) as fehler:
		raise MesswertFehler(f"Abruf von {url} fehlgeschlagen: {fehler}")


def zahl(wert):
	"""Liefert wert als float oder None, wenn es keine Zahl ist."""
	if isinstance(wert, bool) or not isinstance(wert, (int, float)):
		return None
	return float(wert)


def zaehler_holen():
	"""Liefert (antwort, zaehlerdaten) des Smart Meters am Netzeinspeisepunkt."""
	url = f"http://{FRONIUS_HOST}:{FRONIUS_PORT}/solar_api/v1/GetMeterRealtimeData.cgi?Scope=System"
	antwort = json_holen(url)

	try:
		status = antwort["Head"]["Status"]
		alle_zaehler = antwort["Body"]["Data"]
	except (KeyError, TypeError):
		raise MesswertFehler("Antwort der Solar API hat ein unerwartetes Format.")

	if not isinstance(status, dict) or status.get("Code") != 0:
		raise MesswertFehler(f"Solar API meldet einen Fehler: {status}")
	if not isinstance(alle_zaehler, dict) or not alle_zaehler:
		raise MesswertFehler("Die Solar API meldet keinen Smart Meter.")

	orte = []
	for daten in alle_zaehler.values():
		if not isinstance(daten, dict):
			continue
		ort = zahl(daten.get("Meter_Location_Current"))
		if ort == EINSPEISEPUNKT:
			return antwort, daten
		orte.append(ort)

	raise MesswertFehler(
		f"Kein Smart Meter am Netzeinspeisepunkt (Meter_Location_Current = {EINSPEISEPUNKT}) gefunden, "
		f"gefundene Einbauorte: {orte}"
	)


def spannung(daten, phase):
	"""Liefert die Spannung der Phase in Volt oder None, wenn sie fehlt oder außerhalb von ]0, 500] liegt."""
	wert = zahl(daten.get(f"Voltage_AC_Phase_{phase}"))
	if wert is None:
		return None
	wert = round(wert, 2)
	if not 0 < wert <= 500:
		return None
	return wert


def zeitpunkt(antwort, daten):
	"""Liefert den Messzeitpunkt als UTC-datetime: TimeStamp des Zählers, sonst Head.Timestamp."""
	sekunden = zahl(daten.get("TimeStamp"))
	if sekunden is not None:
		try:
			zeit = datetime.fromtimestamp(sekunden, tz=timezone.utc)
		except (ValueError, OverflowError, OSError):
			raise MesswertFehler(f"Die Solar API liefert einen ungültigen Zeitstempel ({sekunden}).")
	else:
		try:
			zeit = datetime.fromisoformat(antwort["Head"]["Timestamp"]).astimezone(timezone.utc)
		except (KeyError, TypeError, ValueError):
			raise MesswertFehler("Die Solar API liefert keinen gültigen Zeitstempel.")

	abweichung_s = abs(time.time() - zeit.timestamp())
	if abweichung_s > MAX_ABWEICHUNG_S:
		raise MesswertFehler(
			f"Zeitstempel {zeit.isoformat()} weicht um {abweichung_s:.0f} s von der Systemzeit ab "
			"und wird verworfen. Uhrzeit von Wechselrichter und System prüfen."
		)
	return zeit


def einstellung(name, standard, umwandeln=str):
	"""Liefert die Environment-Variable name umgewandelt oder standard, wenn sie fehlt oder leer ist."""
	wert = os.environ.get(name, "").strip()
	if not wert:
		return standard
	try:
		return umwandeln(wert)
	except ValueError:
		raise SystemExit(f"FEHLER: Environment-Variable {name}={wert!r} ist ungültig.")


def konfiguration_laden():
	global FRONIUS_HOST, FRONIUS_PORT, LATITUDE, LONGITUDE, PLANT_CAPACITY_KWP
	FRONIUS_HOST = einstellung("FRONIUS_HOST", FRONIUS_HOST)
	FRONIUS_PORT = einstellung("FRONIUS_PORT", FRONIUS_PORT, int)
	LATITUDE = einstellung("LATITUDE", LATITUDE, float)
	LONGITUDE = einstellung("LONGITUDE", LONGITUDE, float)
	PLANT_CAPACITY_KWP = einstellung("PLANT_CAPACITY_KWP", PLANT_CAPACITY_KWP, float)


def konfiguration_pruefen():
	if not FRONIUS_HOST:
		raise SystemExit("FEHLER: FRONIUS_HOST ist nicht gesetzt.")
	if not isinstance(FRONIUS_PORT, int) or not 0 < FRONIUS_PORT <= 65535:
		raise SystemExit("FEHLER: FRONIUS_PORT muss eine Portnummer zwischen 1 und 65535 sein.")
	if zahl(LATITUDE) is None or zahl(LONGITUDE) is None:
		raise SystemExit("FEHLER: LATITUDE und LONGITUDE müssen als Zahl gesetzt sein.")
	if not -90 <= LATITUDE <= 90 or not -180 <= LONGITUDE <= 180:
		raise SystemExit("FEHLER: LATITUDE muss zwischen -90 und 90, LONGITUDE zwischen -180 und 180 liegen.")
	if PLANT_CAPACITY_KWP is not None and (zahl(PLANT_CAPACITY_KWP) is None or not 0 < PLANT_CAPACITY_KWP <= 1000):
		raise SystemExit("FEHLER: PLANT_CAPACITY_KWP muss größer 0 und maximal 1000 sein.")


def payload_erstellen():
	antwort, daten = zaehler_holen()

	l1 = spannung(daten, 1)
	if l1 is None:
		raise MesswertFehler(f"L1: keine gültige Spannung (Voltage_AC_Phase_1 = {daten.get('Voltage_AC_Phase_1')}).")

	# Einphasige Zähler liefern L2/L3 nicht oder mit 0 V, die API erwartet dann -1
	l2 = spannung(daten, 2)
	l3 = spannung(daten, 3)
	if l2 is None and l3 is None:
		l2 = l3 = -1
	elif l2 is None or l3 is None:
		raise MesswertFehler(
			f"L2/L3: nur eine Phase liefert eine gültige Spannung (Voltage_AC_Phase_2 = {daten.get('Voltage_AC_Phase_2')}, "
			f"Voltage_AC_Phase_3 = {daten.get('Voltage_AC_Phase_3')})."
		)

	payload = {
		"observed_at": zeitpunkt(antwort, daten).strftime("%Y-%m-%dT%H:%M:%SZ"),
		"latitude": LATITUDE,
		"longitude": LONGITUDE,
		"l1_v": l1,
		"l2_v": l2,
		"l3_v": l3,
		"integration_version": INTEGRATION_VERSION,
	}

	frequenz = zahl(daten.get("Frequency_Phase_Average"))
	if frequenz is not None and 45 <= frequenz <= 55:
		payload["grid_frequency_hz"] = round(frequenz, 2)
	elif frequenz is not None:
		log(f"Frequenz {frequenz} Hz liegt außerhalb des gültigen Bereichs und wird nicht übertragen.")

	if PLANT_CAPACITY_KWP is not None:
		payload["plant_capacity_kwp"] = PLANT_CAPACITY_KWP

	# Nur das Modell übernehmen, niemals die Seriennummer aus Details.Serial
	details = daten.get("Details")
	modell = details.get("Model") if isinstance(details, dict) else None
	if isinstance(modell, str) and modell.strip():
		payload["smartmeter_model"] = modell.strip()[:120]

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
	except (urllib.error.URLError, OSError, http.client.HTTPException) as fehler:
		raise SystemExit(f"FEHLER: Verbindung zur API fehlgeschlagen: {fehler}")

	if status_code == 202:
		werte = f"L1={payload['l1_v']} L2={payload['l2_v']} L3={payload['l3_v']}"
		if "grid_frequency_hz" in payload:
			werte += f" f={payload['grid_frequency_hz']}"
		log(f"Übertragen ({payload['observed_at']}): {werte} | HTTP 202: {text}")
	elif status_code == 403:
		raise SystemExit(f"FEHLER: 403 – der Standort ist für die Annahme gesperrt: {text}")
	elif status_code == 422:
		raise SystemExit(f"FEHLER: 422 – Payload abgelehnt: {text}")
	else:
		raise SystemExit(f"FEHLER: HTTP {status_code}: {text}")


def main():
	argumente = sys.argv[1:]
	if any(argument != "--dry-run" for argument in argumente):
		raise SystemExit(f"Aufruf: {sys.argv[0]} [--dry-run]")

	konfiguration_laden()
	konfiguration_pruefen()
	try:
		payload = payload_erstellen()
	except MesswertFehler as fehler:
		raise SystemExit(f"FEHLER: {fehler}")

	if "--dry-run" in argumente:
		print(json.dumps(payload, indent="\t", ensure_ascii=False))
		return

	senden(payload)


if __name__ == "__main__":
	main()
