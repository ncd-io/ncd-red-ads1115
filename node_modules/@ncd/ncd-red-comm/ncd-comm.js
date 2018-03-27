"use strict";
process.on('unhandledRejection', r => console.log(r));

const execSync = require('child_process').execSync;
const sp = require('serialport');
const comms = require("./index.js");

module.exports = function(RED) {
	var i2cPool = {};
    function NcdI2CConfig(n) {
        RED.nodes.createNode(this,n);
        this.bus = n.bus;
		this.addr = parseInt(n.addr);
		switch(n.commType){
			case 'standard':
				var port = parseInt(this.bus.split('-')[1]);
				if(typeof i2cPool[port] == 'undefined') i2cPool[port] = new comms.NcdI2C(port);
				this.i2c = i2cPool[port];
				break;
			case 'usb':
				var comm = new comms.NcdSerial(this.bus, 115200);
				if(typeof i2cPool[port] == 'undefined') i2cPool[this.bus] = new comms.UsbI2C(comm);
				this.i2c = i2cPool[port];
				break;
			case 'ncd-usb':
				var comm = new comms.NcdSerial(this.bus, 115200);
				if(typeof i2cPool[this.bus+'-'+this.addr] == 'undefined') i2cPool[this.bus+'-'+this.addr] = new comms.NcdSerialI2C(comm, this.addr);
				this.i2c = i2cPool[this.bus+'-'+this.addr];
				break;
		}
    }
    RED.nodes.registerType("ncd-comm", NcdI2CConfig);
	RED.httpAdmin.get("/ncd/i2c-bus/list/standard", RED.auth.needsPermission('serial.read'), function(req,res) {
		var busses = [];
		if(comms.hasI2C){
			var cmd = execSync('i2cdetect -l');
			cmd.toString().split("\n").forEach((ln) => {
				var bus = ln.toString().split('	')[0];
				if(bus.indexOf('i2c') == 0){
					busses.push(bus);
				}
			});
		}
		res.json(busses);
	});
	RED.httpAdmin.get("/ncd/i2c-bus/list/usb", RED.auth.needsPermission('serial.read'), function(req,res) {
		getSerialDevices(false, res);
	});
	RED.httpAdmin.get("/ncd/i2c-bus/list/ncd-usb", RED.auth.needsPermission('serial.read'), function(req,res) {
		getSerialDevices(true, res);
	});
}

function getSerialDevices(ftdi, res){
	var busses = [];
	sp.list().then((ports) => {
		ports.forEach((p) => {
			if(p.manufacturer == 'FTDI' || !ftdi) busses.push(p.comName);
		});
	}).catch((err) => {

	}).then(() => {
		res.json(busses);
	});
}
