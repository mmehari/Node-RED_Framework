/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED)
{
	"use strict";
	var spawn = require('child_process').spawn;
	var exec = require('child_process').exec;

	// Retrieve base name of a path
	function baseName(path)
	{
		var base = path.substring(path.lastIndexOf('/') + 1); 
		if(base.lastIndexOf(".") != -1)       
			base = base.substring(0, base.lastIndexOf("."));
		return base;
	}

	// Retrieve directory name of a path
	function dirName(path)
	{
		var dir = "";
		if(path.lastIndexOf('/') != -1)
			dir = path.substring(0, path.lastIndexOf('/'));
		else
			dir = path;
		return dir;
	}

	function cooja(n)
	{
		RED.nodes.createNode(this,n);
		this.restart_cooja = n.restart_cooja;
		this.debug = n.debug;
		var node = this;

		this.on("input", function(msg)
		{
			// Contiki log file path, init done string and registered node IDs must be defined
			if(typeof(msg.contiki_log) !== "undefined" && typeof(msg.contiki_done_str) !== "undefined" && msg.node_IDs.length > 0)
			{
				node.status({fill:"green", shape:"dot", text:"executing"});

				var serial2pty_port;
				var simTimer_port;
				// Is cooja application running? We will use the Java VM Process Status tool (JPS)
				node.jps_child = exec("jps | grep cooja.jar", {encoding: 'binary', maxBuffer:1000}, function (error, stdout, stderr)
				{
					var jps_status = stdout.toString().split('\n').filter(function(e){return e;});

					// If cooja/s is/are running and force restart is enabled, kill the process/es
					if(jps_status.length > 0 && node.restart_cooja == true)
					{
						for (var i = 0; i < jps_status.length; i++)
						{
							var cooja_pid = jps_status[i].split(' ')[0];
							process.kill(cooja_pid, 'SIGKILL');
						}
					}

					var arg = "";
					// If Debuging mode is enabled
					if(node.debug === true)
						arg = arg + " -Xdebug -Xnoagent -Xrunjdwp:transport=dt_socket,address=5555,server=y,suspend=y";

					// Graphical mode of simulation
					if(msg.simulation_mode == "gui")
						arg = arg + " -mx10240m -jar " + msg.CONTIKI_DIR + "/tools/cooja/dist/cooja.jar -quickstart="	+ msg.CONTIKI_DIR + "/" + msg.csc_path_rel + " -contiki=" + msg.CONTIKI_DIR;
					// Console mode of simulation
					else
						arg = arg + " -mx10240m -jar " + msg.CONTIKI_DIR + "/tools/cooja/dist/cooja.jar -nogui="	+ msg.CONTIKI_DIR + "/" + msg.csc_path_rel + " -contiki=" + msg.CONTIKI_DIR;

					arg = arg.match(/(?:[^\s"]+|"[^"]*")+/g);

					// Start cooja program
					node.cooja = spawn("java", arg);

					// Cooja sends normal data
					node.cooja.stdout.on('data', function (data)
					{
						// buf2str
						data = data.toString();

						// check for serial2pty port
						if(data.indexOf("serial2pty serial port discovery. Listening on port ") !== -1)
							serial2pty_port = data.substring(data.indexOf("serial2pty serial port discovery. Listening on port ") + 52).trim();

						// check for simulation timer port
						if(data.indexOf("simTimer service. Listening on port ") !== -1)
							simTimer_port = data.substring(data.indexOf("simTimer service. Listening on port ") + 36).trim();

						// Is cooja simulation started?
						if(data.indexOf("Simulation main loop started") !== -1)
						{
							// Cooja process identifier
							msg.cooja_pid = node.cooja.pid;
							// serial2pty serial port discovery
							if(serial2pty_port !== 0)
								msg.serial2pty_port = serial2pty_port;
							// simTimer service
							if(simTimer_port !== 0)
								msg.simTimer_port = simTimer_port;

							// Stop listening on cooja stdout
							node.cooja.stdout.removeAllListeners('data');

							// Follow watching contiki log file
							node.tail = spawn("tail", ["-F", "-n", "0", msg.contiki_log]);

							// Check contiki has finished initializing
							node.tail.stdout.on("data", function (data)
							{
								// data array buf2str
								var data_array = data.toString().split("\n");
								for (var i = 0; i < data_array.length; i++)
								{
									// check for node id
									if(data_array[i].indexOf(msg.contiki_done_str) !== -1)
									{
										var node_ID = parseInt(data_array[i].split(" ")[1]);

										// Check current node is registered
										var node_Idx = msg.node_IDs.indexOf(node_ID);
										if(node_Idx > -1)
											msg.node_IDs.splice(node_Idx, 1);

										// Do all nodes have finished initializing contiki?
										if(msg.node_IDs.length === 0)
										{
											// Stop following contiki log file
											node.tail.kill();

											node.status({});
											node.send([msg, null]);
										}
									}
								}
							});

							node.tail.stderr.on("data", function(data)
							{
								var msg = {payload: data.toString()};

								node.status({fill:"red", shape:"dot", text:"tail stderr"});
								node.send([null, msg]);
							});

							node.tail.on("close", function()
							{
								node.tail = null;
							});
						}
					});

					// Cooja sends error data
					node.cooja.stderr.on('data', function (data)
					{
						var msg = {payload: data.toString()};

						node.status({fill:"red", shape:"dot", text:"Cooja stderr"});
						node.send([null, msg]);
					});

					node.cooja.on('close', function (code)
					{
						node.cooja = null;
					});
				});
			}
		});
	}
	RED.nodes.registerType("cooja",cooja);
}
