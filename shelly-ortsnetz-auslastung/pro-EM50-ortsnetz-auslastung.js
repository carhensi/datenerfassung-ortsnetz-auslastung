// Shelly Pro EM50 script for www.ortsnetz-auslastung.de/v1
//                       before enabling the script:
const la=50.0000;     // insert your latitude here
const lo=10.0000;     // insert your longitude here
const ca=1.8;         // insert your plant capacity in kWp here
const vd=230.0;       // insert your default line voltage here
const fd=50.0;        // insert your default line frequency here

const ur="https://www.ortsnetz-auslastung.de/v1/measurements";    // push url
const sc="Shelly Pro EM50";                                    // data source
const iv="EM50-0.1.1";                                  // integraton version
const ts=300000;                                           // timeslice in ms
const to=10;                                            // https push timeout
const lc=1;                // Bei lc=1 werden Infos in die Konsole ausgegeben
var pp=5.4;             // fixed value or calculated planned productin in kWh
var ev=Shelly.getComponentStatus("EM1",0);              // array for response
var da=Date().toISOString();                                     // timestamp
var sd={observed_at:da,latitude:la,longitude:lo,l1_v:vd, // sd data structure
    l2_v:-1,l3_v:-1,grid_frequency_hz:fd,plant_capacity_kwp:ca,
	pv_forecast_kwh:pp,smartmeter_model:sc,integration_version:iv};
var js=JSON.stringify(sd);
function vc(v){return typeof v==="number"&&v>=70&&v<=300}    // voltage check
function fc(v){return typeof v==="number"&&v>=45&&v<=65}   // frequency check
function pu(){ev=Shelly.getComponentStatus("EM1",0);    // push: get data ch0
// pp=1.0;                    // insert your planned production function here
 if(ev===null||!vc(ev.voltage)||!fc(ev.freq)){              // invalid values
  if(lc==1){console.log("Ortsnetz: EM data invalid")};return}
 sd.observed_at=Date().toISOString();                        // get timestamp
 sd.l1_v=ev.voltage;                                           // get voltage
 sd.grid_frequency_hz=ev.freq;                               // get frequency
 js=JSON.stringify(sd);
 if(lc==1){console.log(sd)};
 try{Shelly.call("HTTP.POST",{url:ur,content_type:"application/json", // push
  ssl_ca:"*",timeout:10,body:js})}
 catch(e){if(lc==1){console.log("Ortsnetz: TryError: ",e)}}}
pu();
Timer.set(ts,true,pu);