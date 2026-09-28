[
    {
        "id": "c98b12f11e40362a",
        "type": "tab",
        "label": "Flow 1",
        "disabled": false,
        "info": "",
        "env": []
    },
    {
        "id": "ksem_modbus_read",
        "type": "modbus-read",
        "z": "c98b12f11e40362a",
        "name": "KSEM Register L1",
        "topic": "",
        "showStatusActivities": false,
        "logIOActivities": false,
        "showErrors": true,
        "showWarnings": true,
        "unitid": "",
        "dataType": "HoldingRegister",
        "adr": "62",
        "quantity": "2",
        "rate": "300",
        "rateUnit": "s",
        "delayOnStart": false,
        "startDelayTime": "",
        "server": "882c2498be36e6d4",
        "useIOFile": false,
        "ioFile": "",
        "useIOForPayload": false,
        "emptyMsgOnFail": false,
        "x": 190,
        "y": 160,
        "wires": [
            [
                "9beb0d9f77da3fe9"
            ],
            [
                "94bd77675cd65953",
                "b7d02c90afeeda46"
            ]
        ]
    },
    {
        "id": "ortsnetz_http_post",
        "type": "http request",
        "z": "c98b12f11e40362a",
        "name": "API HTTP POST",
        "method": "POST",
        "ret": "obj",
        "paytoqs": "ignore",
        "url": "https://www.ortsnetz-auslastung.de/v1/measurements",
        "tls": "",
        "persist": false,
        "proxy": "",
        "insecureHTTPParser": false,
        "authType": "",
        "senderr": false,
        "headers": [],
        "x": 770,
        "y": 80,
        "wires": [
            [
                "ortsnetz_response_handler",
                "5cfd89f46b7e9f00"
            ]
        ]
    },
    {
        "id": "ortsnetz_response_handler",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "Rückmeldung auswerten",
        "func": "// Status-Code der HTTP-Anfrage prüfen\nconst statusCode = msg.statusCode;\n\nif (statusCode === 202) {\n    // Erfolgreich übertragen\n    const ampel = msg.payload.status;\n    \n    // Status-Text unter dem Node-RED Knoten anzeigen\n    node.status({fill:\"green\", shape:\"dot\", text: `Gesendet! Gesamt-Ampel: ${ampel.overall}`});\n    \n    // optional: Hier kann der Kollege z.B. Logik für smarte Verbraucher triggern,\n    // falls die Ampel auf \"yellow\" oder \"red\" springt.\n    msg.payload = {\n        erfolgreich: true,\n        ampel_gesamt: ampel.overall,\n        ampel_l1: ampel.l1,\n        ampel_l2: ampel.l2,\n        ampel_l3: ampel.l3\n    };\n} else if (statusCode === 422) {\n    node.status({fill:\"red\", shape:\"ring\", text: \"Validierungsfehler (422)\"});\n    node.error(\"API Fehler 422: Validierung fehlgeschlagen. Wertebereiche prüfen.\", msg);\n} else if (statusCode === 403) {\n    node.status({fill:\"red\", shape:\"dot\", text: \"Standort gesperrt (403)\"});\n    node.error(\"API Fehler 403: Dieser Standort ist gesperrt.\", msg);\n} else {\n    node.status({fill:\"yellow\", shape:\"ring\", text: `Fehler: ${statusCode}`});\n}\n\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 1050,
        "y": 200,
        "wires": [
            [
                "debug_out"
            ]
        ]
    },
    {
        "id": "debug_out",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "Debug Output",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 1260,
        "y": 200,
        "wires": []
    },
    {
        "id": "9beb0d9f77da3fe9",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "debug 19",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 400,
        "y": 80,
        "wires": []
    },
    {
        "id": "94bd77675cd65953",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "debug 20",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 380,
        "y": 240,
        "wires": []
    },
    {
        "id": "b7d02c90afeeda46",
        "type": "buffer-parser",
        "z": "c98b12f11e40362a",
        "name": "",
        "data": "payload.data",
        "dataType": "msg",
        "specification": "spec",
        "specificationType": "ui",
        "items": [
            {
                "type": "uint32le",
                "name": "item1",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            },
            {
                "type": "uint32be",
                "name": "item2",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            }
        ],
        "swap1": "",
        "swap2": "",
        "swap3": "",
        "swap1Type": "swap",
        "swap2Type": "swap",
        "swap3Type": "swap",
        "msgProperty": "payload",
        "msgPropertyType": "str",
        "resultType": "value",
        "resultTypeType": "return",
        "multipleResult": false,
        "fanOutMultipleResult": false,
        "setTopic": true,
        "outputs": 1,
        "x": 330,
        "y": 320,
        "wires": [
            [
                "8babcaa845bf76a8"
            ]
        ]
    },
    {
        "id": "1f247ee61684ca16",
        "type": "modbus-read",
        "z": "c98b12f11e40362a",
        "name": "KSEM Register L2",
        "topic": "",
        "showStatusActivities": false,
        "logIOActivities": false,
        "showErrors": true,
        "showWarnings": true,
        "unitid": "",
        "dataType": "HoldingRegister",
        "adr": "102",
        "quantity": "2",
        "rate": "300",
        "rateUnit": "s",
        "delayOnStart": false,
        "startDelayTime": "",
        "server": "882c2498be36e6d4",
        "useIOFile": false,
        "ioFile": "",
        "useIOForPayload": false,
        "emptyMsgOnFail": false,
        "x": 179.88333129882812,
        "y": 421.8833312988281,
        "wires": [
            [],
            [
                "808a304964a601f8"
            ]
        ]
    },
    {
        "id": "cdfcbc9d1001de07",
        "type": "modbus-read",
        "z": "c98b12f11e40362a",
        "name": "KSEM Register L3",
        "topic": "",
        "showStatusActivities": false,
        "logIOActivities": false,
        "showErrors": true,
        "showWarnings": true,
        "unitid": "",
        "dataType": "HoldingRegister",
        "adr": "142",
        "quantity": "2",
        "rate": "300",
        "rateUnit": "s",
        "delayOnStart": false,
        "startDelayTime": "",
        "server": "882c2498be36e6d4",
        "useIOFile": false,
        "ioFile": "",
        "useIOForPayload": false,
        "emptyMsgOnFail": false,
        "x": 170,
        "y": 520,
        "wires": [
            [],
            [
                "92be5a63bf981a0d"
            ]
        ]
    },
    {
        "id": "808a304964a601f8",
        "type": "buffer-parser",
        "z": "c98b12f11e40362a",
        "name": "",
        "data": "payload.data",
        "dataType": "msg",
        "specification": "spec",
        "specificationType": "ui",
        "items": [
            {
                "type": "uint32le",
                "name": "item1",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            },
            {
                "type": "uint32be",
                "name": "item2",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            }
        ],
        "swap1": "",
        "swap2": "",
        "swap3": "",
        "swap1Type": "swap",
        "swap2Type": "swap",
        "swap3Type": "swap",
        "msgProperty": "payload",
        "msgPropertyType": "str",
        "resultType": "value",
        "resultTypeType": "return",
        "multipleResult": false,
        "fanOutMultipleResult": false,
        "setTopic": true,
        "outputs": 1,
        "x": 410,
        "y": 420,
        "wires": [
            [
                "00f28f1830a548fd"
            ]
        ]
    },
    {
        "id": "92be5a63bf981a0d",
        "type": "buffer-parser",
        "z": "c98b12f11e40362a",
        "name": "",
        "data": "payload.data",
        "dataType": "msg",
        "specification": "spec",
        "specificationType": "ui",
        "items": [
            {
                "type": "uint32le",
                "name": "item1",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            },
            {
                "type": "uint32be",
                "name": "item2",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            }
        ],
        "swap1": "",
        "swap2": "",
        "swap3": "",
        "swap1Type": "swap",
        "swap2Type": "swap",
        "swap3Type": "swap",
        "msgProperty": "payload",
        "msgPropertyType": "str",
        "resultType": "value",
        "resultTypeType": "return",
        "multipleResult": false,
        "fanOutMultipleResult": false,
        "setTopic": true,
        "outputs": 1,
        "x": 410,
        "y": 520,
        "wires": [
            [
                "92310dbf1a3a5703"
            ]
        ]
    },
    {
        "id": "9bbf03ec226addee",
        "type": "join",
        "z": "c98b12f11e40362a",
        "name": "",
        "mode": "custom",
        "build": "object",
        "property": "payload",
        "propertyType": "msg",
        "key": "topic",
        "joiner": "\\n",
        "joinerType": "str",
        "accumulate": false,
        "timeout": "",
        "count": "4",
        "reduceRight": false,
        "reduceExp": "",
        "reduceInit": "",
        "reduceInitType": "",
        "reduceFixup": "",
        "x": 750,
        "y": 420,
        "wires": [
            [
                "54f06e84ab4ae799",
                "8a30f1b640a8c65c"
            ]
        ]
    },
    {
        "id": "54f06e84ab4ae799",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "debug 22",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 900,
        "y": 420,
        "wires": []
    },
    {
        "id": "8babcaa845bf76a8",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "function 5",
        "func": "var x = 0\nmsg.topic = \"L1\"\nx = msg.payload[1]\nmsg.payload = x\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 520,
        "y": 320,
        "wires": [
            [
                "9bbf03ec226addee"
            ]
        ]
    },
    {
        "id": "00f28f1830a548fd",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "function 6",
        "func": "var x = 0\nmsg.topic = \"L2\"\nx = msg.payload[1]\nmsg.payload = x\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 580,
        "y": 420,
        "wires": [
            [
                "9bbf03ec226addee"
            ]
        ]
    },
    {
        "id": "92310dbf1a3a5703",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "function 7",
        "func": "var x = 0\nmsg.topic = \"L3\"\nx = msg.payload[1]\nmsg.payload = x\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 560,
        "y": 520,
        "wires": [
            [
                "9bbf03ec226addee"
            ]
        ]
    },
    {
        "id": "8a30f1b640a8c65c",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "Payload für API bauen",
        "func": "msg.topic = \"Payload-fuer-API\"\n// 1. Daten aus Array übernehmen\nvar voltL1 = msg.payload.L1\nvar voltL2 = msg.payload.L2\nvar voltL3 = msg.payload.L3\nvar frequenz = msg.payload.Hz\n\n// 2. Feste Standortdaten eures Kollegen (HIER ANPASSEN)\nconst LATITUDE = 54.999999; \nconst LONGITUDE = 8.999999;\n\n// 3. Payload exakt nach API-Spezifikation zusammensetzen\nmsg.payload = {\n    \"observed_at\": new Date().toISOString(),\n    \"latitude\": LATITUDE,\n    \"longitude\": LONGITUDE,\n    \"l1_v\": Math.round(voltL1 * 10) / 10,\n    \"l2_v\": Math.round(voltL2 * 10) / 10,\n    \"l3_v\": Math.round(voltL3 * 10) / 10,\n    \"grid_frequency_hz\": Math.round(frequenz * 100) / 100,\n    \"smartmeter_model\": \"Kostal KSEM\",\n    \"integration_version\": \"node-red-ksem-1.0.0\"\n};\n\n// HTTP Header setzen\nmsg.headers = {\n    \"Content-Type\": \"application/json\"\n};\n\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 740,
        "y": 220,
        "wires": [
            [
                "d5eafb61637bc8db",
                "ortsnetz_http_post"
            ]
        ]
    },
    {
        "id": "d5eafb61637bc8db",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "debug 23",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 1000,
        "y": 280,
        "wires": []
    },
    {
        "id": "5cfd89f46b7e9f00",
        "type": "debug",
        "z": "c98b12f11e40362a",
        "name": "debug 24",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "statusVal": "",
        "statusType": "auto",
        "x": 1000,
        "y": 80,
        "wires": []
    },
    {
        "id": "a27625e12808ac7a",
        "type": "modbus-read",
        "z": "c98b12f11e40362a",
        "name": "KSEM Register Hz",
        "topic": "",
        "showStatusActivities": false,
        "logIOActivities": false,
        "showErrors": true,
        "showWarnings": true,
        "unitid": "",
        "dataType": "HoldingRegister",
        "adr": "26",
        "quantity": "2",
        "rate": "300",
        "rateUnit": "s",
        "delayOnStart": false,
        "startDelayTime": "",
        "server": "882c2498be36e6d4",
        "useIOFile": false,
        "ioFile": "",
        "useIOForPayload": false,
        "emptyMsgOnFail": false,
        "x": 170,
        "y": 600,
        "wires": [
            [],
            [
                "d41358dbb60f8d70"
            ]
        ]
    },
    {
        "id": "d41358dbb60f8d70",
        "type": "buffer-parser",
        "z": "c98b12f11e40362a",
        "name": "",
        "data": "payload.data",
        "dataType": "msg",
        "specification": "spec",
        "specificationType": "ui",
        "items": [
            {
                "type": "uint32le",
                "name": "item1",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            },
            {
                "type": "uint32be",
                "name": "item2",
                "offset": 0,
                "length": 1,
                "offsetbit": 0,
                "scale": "/1000",
                "mask": ""
            }
        ],
        "swap1": "",
        "swap2": "",
        "swap3": "",
        "swap1Type": "swap",
        "swap2Type": "swap",
        "swap3Type": "swap",
        "msgProperty": "payload",
        "msgPropertyType": "str",
        "resultType": "value",
        "resultTypeType": "return",
        "multipleResult": false,
        "fanOutMultipleResult": false,
        "setTopic": true,
        "outputs": 1,
        "x": 410,
        "y": 600,
        "wires": [
            [
                "8aaa8f1364544ebb"
            ]
        ]
    },
    {
        "id": "8aaa8f1364544ebb",
        "type": "function",
        "z": "c98b12f11e40362a",
        "name": "function 8",
        "func": "var x = 0\nmsg.topic = \"Hz\"\nx = msg.payload[1]\nmsg.payload = x\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 580,
        "y": 600,
        "wires": [
            [
                "9bbf03ec226addee"
            ]
        ]
    },
    {
        "id": "882c2498be36e6d4",
        "type": "modbus-client",
        "name": "KSEM",
        "clienttype": "tcp",
        "bufferCommands": true,
        "stateLogEnabled": false,
        "queueLogEnabled": false,
        "failureLogEnabled": true,
        "tcpHost": "0.0.0.1",
        "tcpPort": "502",
        "tcpType": "DEFAULT",
        "serialPort": "/dev/ttyUSB",
        "serialType": "RTU-BUFFERD",
        "serialBaudrate": "9600",
        "serialDatabits": "8",
        "serialStopbits": "1",
        "serialParity": "none",
        "serialConnectionDelay": "100",
        "serialAsciiResponseStartDelimiter": "0x3A",
        "unit_id": "1",
        "commandDelay": "1",
        "clientTimeout": "1000",
        "reconnectOnTimeout": true,
        "reconnectTimeout": "2000",
        "parallelUnitIdsAllowed": true,
        "showWarnings": true,
        "showLogs": true
    }
]
