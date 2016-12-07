import subprocess
from ISStreamer.Streamer import Streamer
from time import sleep

streamer = Streamer(bucket_name="Matrix Calibration", bucket_key="matrixcal", access_key="Your_Access_Key_Here")

while True:
    cpu_temp = subprocess.check_output("vcgencmd measure_temp", shell=True)
    array = cpu_temp.split("=")
    array2 = array[1].split("'")

    cpu_tempf = float(array2[0]) * 9.0 / 5.0 + 32.0
    cpu_tempf = float("{0:.2f}".format(cpu_tempf))
    streamer.log("CPU Temperature",cpu_tempf)
    print(cpu_tempf)
    sleep(300)
