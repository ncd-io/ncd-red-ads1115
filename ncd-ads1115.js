"use strict";

const ADS1115 = require("./index.js");
const Queue = require("promise-queue");

module.exports = function(RED){
	var sensor_pool = {};
	var loaded = [];

	function NcdI2cDeviceNode(config){
		RED.nodes.createNode(this, config);
		this.interval = parseInt(config.interval);
		this.addr = parseInt(config.addr);
		if(typeof sensor_pool[this.id] != 'undefined'){
			//Redeployment
			clearTimeout(sensor_pool[this.id].timeout);
			delete(sensor_pool[this.id]);
		}

		var _config = {};
		for(var i in config){
			if(['OSMode','gain','mode','rate','compMode','compPol','compLat','compQueue','highThresh','lowThresh','delay'].indexOf(i) > -1){
				_config[i] = config[i];
			}
		}
		var channels = {};
		var channel_count = 0;
		var cont_mode_channel = false;
		for(var i=1;i<5;i++){
			if(config['channel_'+i] != '_none'){
				channels['channel_'+i] = config['channel_'+i]*1;
				channel_count++;
			}
		}
		if(_config.mode == 2){
			_config.mode = (channel_count > 1) ? 1 : 0;
		}
		this.sensor = new ADS1115(this.addr, RED.nodes.getNode(config.connection).i2c, _config);
		if(_config.mode == 0){
			var last_mux;
			for(var i in channels){
				last_mux = channels[i];
				cont_mode_channel = i;
			}
			this.sensor.writeConfig(last_mux);
		}else{
			for(var i in channels){
				this.sensor.getSingleShot(channels[i]).then().catch();
				break;
			}
		}

		sensor_pool[this.id] = {
			sensor: this.sensor,
			polling: false,
			timeout: 0,
			node: this
		}

		function device_status(_node){
			if(!_node.sensor.initialized){
				_node.status({fill:"red",shape:"ring",text:"disconnected"});
				return false;
			}
			_node.status({fill:"green",shape:"dot",text:"connected"});
			return true;
		}

		var node = this;
		var mult = config.output_mult*1;
		function send_payload(_status){
			if(cont_mode_channel){
				var tmp = _status;
				_status = {};
				_status[cont_mode_channel] = tmp;
			}
			for(var i in _status) _status[i] *= mult;
			var msg = [],
				dev_status = {topic: 'device_status', payload: _status};
			if(config.output_all){
				for(var i in _status){
					msg.push({topic: i, payload: _status[i]})
				}
				msg.push(dev_status);
			}else{
				msg = dev_status;
			}
			node.send(msg);
		}
		function get_status(msg, repeat, _node){
			if(repeat) clearTimeout(sensor_pool[_node.id].timeout);
			if(device_status(_node)){
				if(_node.sensor.config.mode == 0){
					_node.sensor.get().then(send_payload).catch((err) => {
						_node.send({error: err});
					}).then(() => {
						if(repeat){
							if(_node.interval){
								sensor_pool[_node.id].timeout = setTimeout(() => {
									get_status({sensor: sensor_pool[_node.id].node}, true, sensor_pool[_node.id].node);
								}, _node.interval);
							}else{
								sensor_pool[_node.id].polling = false;
							}
						}
					});
				}else{
					var _status = {};
					var channel_names = [];
					var queue = new Queue(1);

					for(var i in channels){
						channel_names.push(i);
						queue.add(() => {
							return new Promise((fulfill, reject) => {
								_node.sensor.getSingleShot(channels[i]).then((res) => {
									_status[i] = res;
									fulfill();
								}).catch(reject);
							});
						});
					}
					queue.add(() => {
						return new Promise((fulfill, reject) => {
							send_payload(_status);
							fulfill();
							if(repeat){
								if(_node.interval){
									sensor_pool[_node.id].timeout = setTimeout(() => {
										get_status({sensor: sensor_pool[_node.id].node}, true, sensor_pool[_node.id].node);
									}, _node.interval);
								}else{
									sensor_pool[_node.id].polling = false;
								}
							}
						});
					})

				}
			}else{
				if(_node.sensor.config.mode == 0){
					var last_mux;
					for(var i in channels){
						last_mux = channels[i];
					}
					_node.sensor.writeConfig(last_mux);
				}
				sensor_pool[_node.id].timeout = setTimeout(() => {
					get_status({sensor: sensor_pool[_node.id].node}, repeat, sensor_pool[_node.id].node);
				}, 3000);
			}
		}

		if(node.interval && !sensor_pool[node.id].polling){
			sensor_pool[node.id].polling = true;

			get_status({sensor: node}, true, sensor_pool[this.id].node);
		}
		device_status(node);
		node.on('input', (msg) => {
			if(msg.topic == 'get_status'){
				get_status(msg, false, sensor_pool[this.id].node);
			}
		});
	}
	RED.nodes.registerType("ncd-ads1115", NcdI2cDeviceNode)
}
