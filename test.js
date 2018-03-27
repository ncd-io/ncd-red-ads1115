var comms = require('../ncd-red-comm/index.js');
var ADS1115 = require('./index.js');

var serial = new comms.NcdSerial('/dev/tty.usbserial-DN03Q7F9', 115200);
var comm = new comms.NcdSerialI2C(serial, 0);

var config = {
	OSMode: 1,
	rate: 7,
	mode: 1
};
var sensor = new ADS1115(0x48, comm, config);
// sensor.writeConfig(4).then((res) => {
//
// }).catch(console.log);

// setInterval(() => {
// 	sensor.get().then().catch().then((res) => {
// 		console.log(res);
// 		console.log(res * 0.000628);
// 	});
// }, 1000);


setInterval(() => {
	sensor.getSingleShot(4).then().catch().then((res) => {
		console.log(res);
		console.log(res * 0.000628);
	});
}, 1000);
