module.exports = class ADS1115{
	constructor(addr, config, comm){
		this.data = config;
		this.comm = comm;
		this.addr = addr;
		this.settable = [];
		this.initialized = true;
		if(typeof this.init != 'undefined'){
			try{
				this.init();
			}catch(e){
				console.log({'failed to initialize': e});
				this.initialized = false;
			}
		}
	}
	init(){
		this.iodir = 0;
		this.data.ios = {};
		for(var i=8;i>0;i--){
			this.iodir = (this.iodir << 1) | (this.data["io_"+i] ? 0 : 1);
			this.data.ios[i] = this.data["io_"+i] ? 1 : 0;
		}
		console.log(this.iodir);
		Promise.all([
			this.comm.writeBytes(this.addr, 0x00, this.iodir),
			// this.comm.writeBytes(this.addr, 0x01, 0),
			this.comm.writeBytes(this.addr, 0x06, this.iodir)
		]).then().catch();
		this.settable = ['all', 'channel_1', 'channel_2', 'channel_3', 'channel_4', 'channel_5', 'channel_6', 'channel_7', 'channel_8'];
	}
	get(){
		var sensor = this;
		return new Promise((fulfill, reject) => {
			Promise.all([
				sensor.comm.readByte(sensor.addr, 9),
				//sensor.comm.readByte(sensor.addr, 10)
			]).then((res) => {
				sensor.input_status = res[0];
				sensor.output_status = res[1];
				var readings = sensor.parseStatus();
				fulfill(readings);
			}).catch(reject);
		});
	}
	parseStatus(){
		var ios = this.data.ios,
			readings = {};
		for(var i in ios){
			if(ios[i] == 1) readings["channel_"+i] = this.output_status & (1 << (i-1)) ? 1 : 0;
			else readings["channel_"+i] = this.input_status & (1 << (i-1)) ? 0 : 1;
		}
		return readings;
	}
	set(topic, value){
		var sensor = this;
		return new Promise((fulfill, reject) => {
			//sensor.get().then((res) => {
				var status = sensor.output_status;
				if(topic == 'all'){
					if(status != value){
						sensor.output_status = value;
						sensor.comm.writeBytes(this.addr, 0x0A, value).then(fulfill(sensor.parseStatus())).catch(reject);
					}else{
						fulfill(res);
					}
				}else{
					var channel = topic.split('_')[1];
					if(value == 1){
						status |= (1 << (channel-1));
					}else if(value == 2){
						status ^= (1 << (channel-1));
					}else{
						status &= ~(1 << (channel - 1));
					}
					if(sensor.output_status != status){
						sensor.output_status = status;
						sensor.comm.writeBytes(sensor.addr, 0x0A, status).then(fulfill(sensor.parseStatus())).catch(reject);
					}else{
						fulfill(sensor.parseStatus());
					}
				}
			// }).catch((err) => {
			// 	console.log(err);
			// 	reject(err);
			// });
		});
	}
}
