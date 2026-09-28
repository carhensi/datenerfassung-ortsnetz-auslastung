// Shelly Pro 3EM / Pro 3EM-400 script for Ortsnetz-Auslastung.
// https://www.ortsnetz-auslastung.de/
// Set the four values in CONFIG before enabling the script.
// Datei: PostData_ShellyPro3EM_ortsnetz-auslastung_V011_200926.txt
// Autor: Thomas Lehmann / Juergen Gensicke
// https://github.com/thomaslehmann1234/datenerfassung-ortsnetz-auslastung
// VERSION = "0.1.1" vom 20.09.26
// IP: 192.168.x.y

// for Debugg:
const log_c = 0; // log_c = 1 heisst, es werden Infos in die Konsole ausgegeben.

let CONFIG = {
  apiUrl: "https://www.ortsnetz-auslastung.de/v1/measurements",
  latitude: 0,
  longitude: 0,
  smartmeterModel: "Shelly Pro 3EM",
  intervalMs: 300000
};

let VERSION = "0.1.1";

function validVoltage(value) {
  return typeof value === "number" && value >= 150 && value <= 300;
}

function validFrequency(value) {
  return typeof value === "number" && value >= 45 && value <= 55;
}

function reportResult(result, errorCode, errorMessage) {
  if (errorCode !== 0) {
    console.log("Ortsnetz request failed: " + errorMessage);
    return;
  }
  if (result.code < 200 || result.code >= 300) {
    console.log("Ortsnetz API returned HTTP " + result.code);
  }
}

function sendMeasurement() {
	let em = Shelly.getComponentStatus("em:0");
	if (em === null || !validVoltage(em.a_voltage) || !validVoltage(em.b_voltage) || !validVoltage(em.c_voltage)) {
		console.log("Ortsnetz: voltage is unavailable or outside 150-300 V");
		return;
	}
	
	let payload = {
		observed_at: new Date().toISOString(),
		latitude: CONFIG.latitude,
		longitude: CONFIG.longitude,
		l1_v: em.a_voltage,
		l2_v: em.b_voltage,
		l3_v: em.c_voltage,
		grid_frequency_hz: validFrequency(em.a_freq) ? em.a_freq : null,
		smartmeter_model: CONFIG.smartmeterModel,
		integration_version: "shelly-" + VERSION
	};

	let payload_body = JSON.stringify(payload);

	if (log_c == 1) {
		print (payload_body);
	}

	try {
	Shelly.call(
		"HTTP.POST",
		{ url: CONFIG.apiUrl,
		  content_type: "application/json",
		  ssl_ca: "*",
		  timeout: 10,
		  body: payload_body,
		},
		function (result, err_code, err_message) {
			if (err_code !== 0) {
				print(err_message);
				reportResult(result, err_code, err_message);
			}
			console.log("Pushed result", JSON.stringify(result));
		}
		);
	} catch (e) {
		if (log_c == 1) {
			print ("TryError: "+e);
		}
	};
}

sendMeasurement();
Timer.set(CONFIG.intervalMs, true, sendMeasurement);

