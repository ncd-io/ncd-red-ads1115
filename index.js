module.exports = class ADS111x{
	constructor(addr, comm, config){
		if(typeof config != 'object') config = {};
		this.config = Object.assign({
			//Operational status/single-shot conversion start
			//write: 0 = No Effect, 1 = Begin a single conversion
			//read: 0 = Busy, 1: Not Busy
			OSMode: 0,

			//Programmable gain amplifier configuration
			//0-6, 0 == 6.144v range, all others can be calculated as: (4.096 / (1 << (n-1)))v range
			gain: 2,

			//Operating Mode
			//0=Continuous conversion mode, 1=Power-down single-shot mode
			mode: 1,

			//Data rate
			//0=8SPS
			//1-4 = (16 << (n-1))SPS
			//5 = 250SPS
			//6 = 475SPS
			//7 = 860SPS
			rate: 4,

			//Comparator Mode
			//0 = Traditional comparator with hysteresis, 1 = Window comparator
			compMode: 0,

			//Comparator Polarity
			//0 = Active low, 1 = Active high
			compPol: 0,

			//Latching comparator
			//0 = Non-latching, 1 = Latching
			compLat: 0,

			//Comparator queue
			//0 = Assert after 1 conversion, 1 = 2 converions, 2 = 4 conversions, 3 = disabled
			compQueue: 3,


			//TODO: add handling for setting thresholds
			//High threshold
			highThresh: 32767,

			//Low threshold
			lowThresh: 32768,

			//delay for conversion after writing config
			delay: 500
		}, config);
		this.comm = comm;
		this.addr = addr;
	}

	writeConfig(mux){
		var config = 	(this.config.OSMode << 15) |
						(this.config.gain << 9) |
						(this.config.mode << 8) |
						(this.config.rate << 5) |
						(this.config.compMode << 4) |
						(this.config.compPol << 3) |
						(this.config.compLat << 2) |
						this.config.compQueue;

		// console.log([
		// 	(this.config.OSMode << 15).toString(16),
		// 	(this.config.gain << 9).toString(16),
		// 	(this.config.mode << 8).toString(16),
		// 	(this.config.rate << 5).toString(16),
		// 	(this.config.compMode << 4).toString(16),
		// 	(this.config.compPol << 3).toString(16),
		// 	(this.config.compLat << 2).toString(16),
		// 	this.config.compQueue.toString(16),
		// 	(mux << 12).toString(16)
		// ]);
		config |= (mux << 12);
		return new Promise((fulfill, reject) => {
			this.comm.writeBytes(this.addr, 1, (config >> 8), (config & 255)).then((res) => {
				this.initialized = true;
				fulfill(res);
			}).catch((err) => {
				this.initialized = false;
				reject(err);
			})
		});
	}

	//The channel to read from
	//if single == false, this will run in differential mode:
	//0: 0 and 1
	//1: 0 and 3
	//2: 1 and 3
	//3: 2 and 3
	//if single == true this will test the value of the channel (0-3) against ground
	getSingleShot(channel, single){
		var sensor = this;
		var OSMode = sensor.config.OSMode;
		sensor.config.OSMode = 1;
		return new Promise((fulfill, reject) => {
			if(single) channel |= 4;
			sensor.writeConfig(channel).then((res) => {
				setTimeout(function(){
					sensor.comm.readBytes(sensor.addr, 0, 2).then((res) => {
						sensor.config.OSMode = OSMode;
						fulfill((res[0] << 8) + res[1]);
					}).catch(reject);
				}, sensor.config.delay);
			}).catch(reject);
		});
	}
	get(){
		var sensor = this;
		return new Promise((fulfill, reject) => {
			sensor.comm.readBytes(sensor.addr, 0, 2).then((res) => {
				fulfill((res[0] << 8) + res[1]);
			}).catch(reject);
		});
	}

	getConfig(prop){
		if(typeof this.config != 'undefined'){
			return this.config[prop];
		}
		return null;
	}
	setConfig(prop, value){
		if(typeof this.config != 'undefined'){
			return this.config[prop] = value;
		}
		return nul;
	}
}
