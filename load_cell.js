var phid;
var logging;
var data = [];
var xval = [];
var yval = [];

// calibration values
var a_calib = 37735849;
var b_calib = -1100;


$(document).ready(function () {
	var conn = new phidget22.Connection(8989, 'localhost');
	var ch = new phidget22.VoltageRatioInput();

	ch.onError = onError;
	ch.onPropertyChange = propChange;
    ch.onAttach = onAttach;
    // ch.onStart = startLOG;
    logging = 0
    
    console.log(ch)

	// If you want to open an input on a specific device, set the serial number:
	// ch.setDeviceSerialNumber(580222);

    // If you want to use the VoltageRatioInput mode of a port on your VINT hub, use these:
	//ch.setIsHubPortDevice(true);
	//ch.setHubPort(0);

	ch.onDetach = function(ch) {
		$('#ratioField').hide();
		$('#errorField').hide();
		$('#Attach').hide();
		$('#noAttach').show();
	}

	conn.connect().then(function () {
		console.log('connected');
		ch.open().then(function (ch) {
			console.log('channel open');
		}).catch(function (err) {
			console.log('failed to open the channel:' + err);
		});
	}).catch(function (err) {
		alert('failed to connect to server:' + err);
    });;
    
    // Initialize the plot
    clearPlot()
});


function startLOG(){
    console.log("start logging");
	logging = 1;
	// we add a point at 0 load
	ratioChange(-b_calib/a_calib)
}

function stopLOG(){
	console.log("Stop logging");
	ratioChange(-b_calib/a_calib)
	logging = 0;
	
}

function clearLOG(){
    console.log("Clear data")
    data = [];
    clearPlot();
}

function clearPlot(){
    // Initialize the plot
    var d0 = {x: [],
        y: [],
      type: "line"}
    var l0 = {
        xaxis:{title:{text: "Time [sec]"}},
        yaxis:{title:{text: "Load [kg]"}}
    }
    Plotly.newPlot("plot", [d0], l0);
}

function saveLOG(){
    var dd = new Date()
	// var fname = dd.toISOString().substr(0, 10)+"_T"+dd.toLocaleTimeString()+"_load_cell.json"
	var fname = dd.toISOString().substr(0, 10)+"_T"+dd.toLocaleTimeString()+"_load_cell.csv"
    console.log("Saving data into : "+fname)
	// download(data, fname, 'text/plain')
	downloadCSV(data,fname)
}


function onAttach(ch) {
	console.log(ch + ' attached');
	phid = ch;
	setLabel('attachLabel',ch.getDeviceClassName() + ' - ' + ch.getChannelClassName() + ' (Channel ' + ch.getChannel() + ')');
	setLabel('serialLabel',ch.getDeviceSerialNumber());
	setLabel('versionLabel',ch.getDeviceSKU() + ' ver.' + ch.getDeviceVersion());
	
	if(ch.getDeviceClass() == phidget22.DeviceClass.VINT) 
		setLabel('hubPortLabel',ch.getHubPort());
	else
		setLabel('hubPortLabel','N/A');

	phid.onVoltageRatioChange = ratioChange;
	phid.onSensorChange = svChange;
	phid.onError = onError;
	phid.onPropertyChange = propChange;

	
	// we are forcing the initialization of the DataInterval to 512
	// $('#di').val(phid.getDataInterval());
	$('#di').val(+1000);
	$('#ct').val(phid.getVoltageRatioChangeTrigger());

	switch(phid.getDeviceID()){
		
	    case phidget22.DeviceID.PN_1046:
			phid.setBridgeGain($('#gainCombo').val());
			$('#sensorLabel').hide();
			$('#sensorCombo').hide();
			$('#sensorValue').hide();
			$('#unit').hide();
			$("#gainCombo option[value='2']").remove();
			$("#gainCombo option[value='3']").remove();
			// Adding some settings for the load cell device
			$("#gainCombo option[value='1']").remove();
			break;
	    case phidget22.DeviceID.PN_DAQ1500:
	        $('#gainCombo').val(phid.getBridgeGain());
			$('#enableLabel').hide();
			$('#enableBox').hide();
			$('#sensorLabel').hide();
			$('#sensorCombo').hide();
			$('#sensorValue').hide();
			$('#unit').hide();
			$("#gainCombo option[value='3']").remove();
			$("#gainCombo option[value='4']").remove();
			$("#gainCombo option[value='5']").remove();
			$("#gainCombo option[value='6']").remove();
			break;
	    case phidget22.DeviceID.PN_1065:
        case phidget22.DeviceID.VOLTAGE_RATIO_INPUT_PORT:
	    case phidget22.DeviceID.PN_1010_1013_1018_1019:
	    case phidget22.DeviceID.PN_1011:
	    case phidget22.DeviceID.PN_1202_1203:
	    case phidget22.DeviceID.PN_DAQ1000:
			$('#gainCombo').hide();
			$('#gainLabel').hide();
			$('#enableLabel').hide();
			$('#enableBox').hide();
			break;

	}

	$('#ratioField').show();
	$('#noAttach').hide();
	$('#Attach').show();
}

function propChange(prop) {
    console.log(propChange)
    if (prop === 'DataInterval')
        $('#di').val(this.getDataInterval());

    if (prop === 'VoltageRatioChangeTrigger')
        $('#ct').val(this.getVoltageRatioChangeTrigger());

    if (prop === 'BridgeEnabled')
        $('#enableBox').prop("checked",this.getBridgeEnabled());

    if (prop === 'BridgeGain')
        $('#gainCombo').val(this.getBridgeGain());

    if (prop === 'SensorType')
        $('#sensorCombo').val(this.getSensorType());
}

function ratioChange(ratio) {
    let load = (ratio*a_calib+b_calib)/1000
    if (logging == 1) {
		// console.log(ratio, new Date().getTime())		
		current_time =  new Date().getTime()
		if (data.length === 0){
			tstep = 0
		} else{
			tstep = (current_time - data[0].timeStamp)/1000
		}
		data.push({"voltageRatio": ratio,
					"timeStamp": current_time,
				   "timeStep": tstep,				   
                	"load_kg": +load.toPrecision(4)})

        var trace2 = { x: data.map(d => d.timeStep),
                       y: data.map(d => d.load_kg ),
                        }                    
        // Plotly.react("plot", [trace2], {})
        var l0 = {
            xaxis:{title:{text: "Time [sec]"}},
            yaxis:{title:{text: "Load [kg]"}}
        }
        Plotly.react("plot", [trace2], l0) 
    }  
    $('#VoltageRatio').val(ratio);
    $('#LoadValue').val(load.toPrecision(4));
    
}

function convertArrayOfObjectsToCSV(data){ //args) {  
	var result, ctr, keys, columnDelimiter, lineDelimiter //, data;

	// data = args.data || null;
	if (data == null || !data.length) {
		return null;
	}

	// columnDelimiter = args.columnDelimiter || ',';
	// lineDelimiter = args.lineDelimiter || '\n';
	columnDelimiter = ', ';
	lineDelimiter = '\n';

	keys = Object.keys(data[0]);

	result = '';
	result += keys.join(columnDelimiter);
	result += lineDelimiter;

	data.forEach(function(item) {
		ctr = 0;
		keys.forEach(function(key) {
			if (ctr > 0) result += columnDelimiter;

			result += item[key];
			ctr++;
		});
		result += lineDelimiter;
	});

	return result;
}



// Function to download data to a file
// download('file text', 'myfilename.txt', 'text/plain')
function download(data, filename, type) {
    // var file = new Blob([data], {type: type});
    var file = new Blob([JSON.stringify(data)], {type: type});
    // JSON.stringify(data)
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function downloadCSV(data, filename) {  
	// var data, filename, link;
	var link;
	var csv = convertArrayOfObjectsToCSV(data);
	if (csv == null) return;

	// filename = args.filename || 'export.csv';

	if (!csv.match(/^data:text\/csv/i)) {
		csv = 'data:text/csv;charset=utf-8,' + csv;
	}
	data = encodeURI(csv);

	link = document.createElement('a');
	link.setAttribute('href', data);
	link.setAttribute('download', filename);
	link.click();
}

function svChange(sensorValue, sensorUnit) {
    console.log("svChange")
    $('#sensorValue').val(sensorValue);
    $('#unit').text(sensorUnit.symbol);
}

function sensorChange() {

    phid.setSensorType($('#sensorCombo').val());
}

function enableChange() {

	phid.setBridgeEnabled($('#enableBox')[0].checked);
}

function gainChange() {

	phid.setBridgeGain($('#gainCombo').val());
}

function onError(arg0, arg1) {

    var d = new Date();
    $('#errorTable').append('<tr><td> ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + '</td><td> 0x' + arg0.toString(16) + '</td><td>' + arg1 + '</td>');
    $("#errorField").show();
}

function setDI() {

	var di = parseInt($('#di').val());
	if (di === NaN)
		return (false);

	if (di < phid.getMinDataInterval()) {
		di = phid.getMinDataInterval();
		$('#di').val(di);
	}

	if (di > phid.getMaxDataInterval()) {
		di = phid.getMaxDataInterval();
		$('#di').val(di);
	}

	phid.setDataInterval(di);
	return (false);
}

function setCT() {

	var ct = parseFloat($('#ct').val());
	if (ct === NaN)
		return (false);

    if (ct < phid.getMinVoltageRatioChangeTrigger()) {
        ct = phid.getMinVoltageRatioChangeTrigger();
        $('#ct').val(ct);
    }

    if (ct > phid.getMaxVoltageRatioChangeTrigger()) {
        ct = phid.getMaxVoltageRatioChangeTrigger()-0.1;
        $('#ct').val(ct);
    }


	phid.setVoltageRatioChangeTrigger(ct);
	return (false);
}

function setLabel(name, value) {

    $('#' + name).text(value);
}
