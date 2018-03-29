var comms = require('ncd-red-comm');
var ADS1115 = require('./index.js');

/*
 * Allows use of a USB to I2C converter form ncd.io
 */
//var port = '/dev/tty.usbserial-DN03Q7F9';
//var serial = new comms.NcdSerial('/dev/tty.usbserial-DN03Q7F9', 115200);
//var comm = new comms.NcdSerialI2C(serial, 0);

/*
 * Use the native I2C port on the Raspberry Pi
 */
var comm = new comms.NcdI2C(1);

var config = {
	OSMode: 1,
	rate: 7,
	mode: 1
};
var sensor = new ADS1115(0x48, comm, config);

/*
 * Test continuous conversion mode
 */
// sensor.writeConfig(4).then((res) => {
//
// }).catch(console.log);

// setInterval(() => {
// 	sensor.get().then().catch().then((res) => {
// 		console.log(res);
// 		console.log(res * 0.000628);
// 	});
// }, 1000);
/*
 * End continuous conversion test
 */


 /*
  * Test power down single shot mode
  */
setInterval(() => {
	sensor.getSingleShot(4).then().catch().then((res) => {
		console.log(res);
		console.log(res * 0.000628);
	});
}, 1000);
/*
 * End power down single shot test
 */
