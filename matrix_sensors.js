// Adapted from the Matrix-Creator-Malos repo

// We connect to the creator with IP and port
// The IP is the Pi's local IP
// By default, MALOS has its 0MQ ports open to the world

// Every device is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

var creator_ip = '127.0.0.1'
var creator_humidity_base_port = 20013 + 4 // port for Humidity driver.
var creator_pressure_base_port = 20013 + (4 * 3) // port for Pressure driver.
var creator_uv_base_port = 20013 + (4 * 4) // port for UV driver.
var creator_imu_base_port = 20013

var protoBuf = require("protobufjs")

// Initial State SDK
var IS = require('initial-state');
// Be sure to put your unique Access Key below
var bucket = IS.bucket('Matrix Sensor Readings', 'Your_Access_Key_Here');

// Parse proto file
var protoBuilder = protoBuf.loadProtoFile('../../protocol-buffers/malos/driver.proto')
// Parse matrix_malos package (namespace).
var matrixMalosBuilder = protoBuilder.build("matrix_malos")

var zmq = require('zmq')


// ********** Start error management.

// Humidity sensor errors
var errorSocketH = zmq.socket('sub')
errorSocketH.connect('tcp://' + creator_ip + ':' + (creator_humidity_base_port + 2))
errorSocketH.subscribe('')
errorSocketH.on('message', function(error_message) {
  process.stdout.write('Message received: Humidity error: ' + error_message.toString('utf8') + "\n")
});

// Pressure sensor errors
var errorSocketP = zmq.socket('sub')
errorSocketP.connect('tcp://' + creator_ip + ':' + (creator_pressure_base_port + 2))
errorSocketP.subscribe('')
errorSocketP.on('message', function(error_message) {
  process.stdout.write('Message received: Pressure error: ' + error_message.toString('utf8') + "\n")
});

// UV sensor errors
var errorSocketU = zmq.socket('sub')
errorSocketU.connect('tcp://' + creator_ip + ':' + (creator_uv_base_port + 2))
errorSocketU.subscribe('')
errorSocketU.on('message', function(error_message) {
  process.stdout.write('Message received: UV error: ' + error_message.toString('utf8') + "\n")
});

// IMU sensor errors
var errorSocketI = zmq.socket('sub')
errorSocketI.connect('tcp://' + creator_ip + ':' + (creator_imu_base_port + 2))
errorSocketI.subscribe('')
errorSocketI.on('message', function(error_message) {
  process.stdout.write('Message received: IMU error: ' + error_message.toString('utf8') + "\n")
});
// ********** End error management.


// ********** Start configuration.

// Humidity sensor configuration
var configSocketH = zmq.socket('push')
configSocketH.connect('tcp://' + creator_ip + ':' + creator_humidity_base_port)
var driverConfigProtoH = new matrixMalosBuilder.DriverConfig
// 5 minutes between updates.
driverConfigProtoH.delay_between_updates = 300.0
// Stop sending updates 6 seconds after pings.
driverConfigProtoH.timeout_after_last_ping = 6.0
var hum_params_msg = new matrixMalosBuilder.HumidityParams
// Real current temperature [Celsius] for calibration
hum_params_msg.current_temperature = 23
hum_params_msg.do_calibration = true
driverConfigProtoH.set_humidity(hum_params_msg)
// Send driver configuration.
configSocketH.send(driverConfigProtoH.encode().toBuffer())

// Pressure sensor configuration
var configSocketP = zmq.socket('push')
configSocketP.connect('tcp://' + creator_ip + ':' + creator_pressure_base_port)
// Now prepare valid configuration and send it.
var driverConfigProtoP = new matrixMalosBuilder.DriverConfig
// 5 minutes between updates.
driverConfigProtoP.delay_between_updates = 300.0
// Stop sending updates 6 seconds after pings.
driverConfigProtoP.timeout_after_last_ping = 6.0
configSocketP.send(driverConfigProtoP.encode().toBuffer())

// UV sensor configuration
var configSocketU = zmq.socket('push')
configSocketU.connect('tcp://' + creator_ip + ':' + creator_uv_base_port)
// Send driver configuration.
var driverConfigProtoU = new matrixMalosBuilder.DriverConfig
// 5 minutes between updates.
driverConfigProtoU.delay_between_updates = 300.0
// Stop sending updates 6 seconds after pings.
driverConfigProtoU.timeout_after_last_ping = 6.0
configSocketU.send(driverConfigProtoU.encode().toBuffer())

// IMU sensor configuration
var configSocketI = zmq.socket('push')
configSocketI.connect('tcp://' + creator_ip + ':' + creator_imu_base_port)
// Now prepare valid configuration and send it.
var driverConfigProtoI = new matrixMalosBuilder.DriverConfig
// 5 minutes between updates.
driverConfigProtoI.delay_between_updates = 300.0
// Stop sending updates 6 seconds after pings.
driverConfigProtoI.timeout_after_last_ping = 6.0
configSocketI.send(driverConfigProtoI.encode().toBuffer())
// ********** End configuration.


// ********** Start updates - Here is where they are received.

// Read from Humidity sensor
var updateSocketH = zmq.socket('sub')
updateSocketH.connect('tcp://' + creator_ip + ':' + (creator_humidity_base_port + 3))
updateSocketH.subscribe('')
updateSocketH.on('message', function(buffer) {
  var hdata = new matrixMalosBuilder.Humidity.decode(buffer)
  // Print readings
  console.log(hdata)
  // Stream readings
  bucket.push(':sweat_drops:Humidity',hdata.humidity)
  bucket.push(':thermometer:Temperature',hdata.temperature)
  bucket.push('Temperature Raw',hdata.temperature_raw)
});

// Read from Pressure sensor
var updateSocketP = zmq.socket('sub')
updateSocketP.connect('tcp://' + creator_ip + ':' + (creator_pressure_base_port + 3))
updateSocketP.subscribe('')
updateSocketP.on('message', function(buffer) {
  var pdata = new matrixMalosBuilder.Pressure.decode(buffer)
  // Print readings
  console.log(pdata)
  // Stream readings
  bucket.push(':arrow_right::arrow_left:Pressure',pdata.pressure)
  bucket.push(':airplane_small:Altitude',pdata.altitude)
  bucket.push('Pressure Temperature',pdata.temperature)
});

// Read from UV sensor
var updateSocketU = zmq.socket('sub')
updateSocketU.connect('tcp://' + creator_ip + ':' + (creator_uv_base_port + 3))
updateSocketU.subscribe('')
updateSocketU.on('message', function(buffer) {
  var udata = new matrixMalosBuilder.UV.decode(buffer)
  // Print readings
  console.log(udata)
  // Stream readings
  bucket.push(':high_brightness:UV Index',udata.uv_index)
  bucket.push(':fire:UV Risk',udata.oms_risk)
});

// Read from IMU sensor
var updateSocketI = zmq.socket('sub')
updateSocketI.connect('tcp://' + creator_ip + ':' + (creator_imu_base_port + 3))
updateSocketI.subscribe('')
updateSocketI.on('message', function(imu_buffer) {
  var imuData = new matrixMalosBuilder.Imu.decode(imu_buffer)
  // Print readings
  console.log(imuData)
  // Stream readings
  bucket.push(':left_right_arrow:Yaw',imuData.yaw)
  bucket.push(':arrow_up_down:Pitch',imuData.pitch)
  bucket.push(':arrow_lower_left::arrow_upper_right:Roll',imuData.roll)
});
// ********** End updates


// ********** Ping the driver

// Humidity driver
var pingSocketH = zmq.socket('push')
pingSocketH.connect('tcp://' + creator_ip + ':' + (creator_humidity_base_port + 1))
process.stdout.write("Sending pings every 5 seconds");
pingSocketH.send(''); // Ping the first time.
setInterval(function(){
  pingSocketH.send('');
}, 5000);

// Pressure driver
var pingSocketP = zmq.socket('push')
pingSocketP.connect('tcp://' + creator_ip + ':' + (creator_pressure_base_port + 1))
//process.stdout.write("Sending pings every 5 seconds");
pingSocketP.send(''); // Ping the first time.
setInterval(function(){
  pingSocketP.send('');
}, 5000);

// UV driver
var pingSocketU = zmq.socket('push')
pingSocketU.connect('tcp://' + creator_ip + ':' + (creator_uv_base_port + 1))
//process.stdout.write("Sending pings every 5 seconds");
pingSocketU.send(''); // Ping the first time.
setInterval(function(){
  pingSocketU.send('');
}, 5000);

// IMU driver
var pingSocketI = zmq.socket('push')
pingSocketI.connect('tcp://' + creator_ip + ':' + (creator_imu_base_port + 1))
//process.stdout.write("Sending pings every 5 seconds");
pingSocketI.send(''); // Ping the first time.
setInterval(function(){
  pingSocketI.send('');
}, 5000);
// ********** Ping the driver ends

