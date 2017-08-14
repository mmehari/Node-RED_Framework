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
	var fs = require("fs-extra");

	// Convert integer to hexadecimal of given size
	function int2hex(integer, size)
	{
		// Is the passed value an integer
		if(Number.isInteger(integer) === true)
		{
			var buf = Buffer.allocUnsafe(4);
			// 8 bit integer
			if(size == 1)
			{
				var uint8 = new Uint8Array([integer]);
				buf.writeUInt8(uint8[0], 0);
			}
			// 16 bit integer
			else if(size == 2)
			{
				var uint16 = new Uint16Array([integer]);
				buf.writeUInt16LE(uint16[0], 0);
			}
			// Else, use 32 bit integer
			else
			{
				size = 4;
				var uint32 = new Uint32Array([integer]);
				buf.writeUInt32LE(uint32[0], 0);
			}
			return buf.toString('hex', 0, size);
		}
		else
		{
			console.error("int2hex: " + integer + " is not an integer");
		}
	}

	function file_search(n)
	{
		RED.nodes.createNode(this,n);
		this.filename = n.filename;

		var node = this;

		this.on("input", function(msg)
		{
			node.status({fill:"green", shape:"dot", text:"executing"});

			// Sample index and SampleSet variables
			var sample_Idx;
			var sampleSet;

			// Re/Start experiment
			if(msg.topic == "start_experiment" || msg.topic == "restart_experiment")
			{
				// Reset global variables
				node.sampleSet_data = [];

				// Rearrange PUT structure
				node.PUT = {};
				node.uid_array = [];
				for(var p = 0; p < msg.PUT.length; p++)
				{
					var PUT = msg.PUT[p];

					// Retreive all ptsFiles within a single PUT structure
					var ptsFiles = [];
					for(var i = 0; i < PUT.GROUPs.length; i++)
					{
						var GROUP = PUT.GROUPs[i];
						for(var j = 0; j < GROUP.length; j++)
							ptsFiles.push(GROUP[j].ptsFile);
					}

					// Iterateively add parameters
					var control_hdr = PUT.control_hdr;					
					for(var i = 0; i < control_hdr.length; i++)
					{
						var uid = control_hdr[i].uid;

						// Parameter was not added previously
						if(!node.PUT.hasOwnProperty(uid))
						{
							node.PUT[uid] = {ptsFiles: ptsFiles, control_hdr: control_hdr[i]};
							node.uid_array.push(uid);
						}
						else
						{
							// Make sure current and previous control headers are similar
							var prev_control_hdr = node.PUT[uid].control_hdr;
							var curr_control_hdr = control_hdr[i];
							if(JSON.stringify(prev_control_hdr) === JSON.stringify(curr_control_hdr))
							{
								// Merge current and previous ptsFiles
								node.PUT[uid].ptsFiles = node.PUT[uid].ptsFiles.concat(ptsFiles);
							}
							else
							{
								msg.payload = "file-search: PUTs@uid=" + uid + " have different values";
								node.send([null, msg]);
								return;
							}
							
						}
					}
				}

				// Construct file search sampleSet data
				if (node.filename === "")
				{
					node.warn("no file name specified");
				}
				else
				{
					var sampleSet = fs.readFileSync(node.filename, {"encoding": "utf8"}).split('\n').filter(function(e){return e;});
					for(var i = 0; i < sampleSet.length; i++)
						node.sampleSet_data.push(sampleSet[i].split('\t'));
				}

				// Initial sample index
				sample_Idx = 0;

				// If topic is to restart the experiment, update the sample index
				if(msg.topic == "restart_experiment")
				{
					// If message does not contain sample_Idx field
					if(typeof(msg.sample_Idx) === "undefined")
					{
						msg.payload = "file-search: undefined sample_Idx field";
						node.send([null, msg]);
						return;
					}

					// Retreive sample index
					sample_Idx = msg.sample_Idx;
				}
			}
			else
			{
				// If message does not contain sample_Idx field
				if(typeof(msg.sample_Idx) === "undefined")
				{
					msg.payload = "file-search: undefined sample_Idx field";
					node.send([null, msg]);
					return;
				}

				// Retreive sample index
				sample_Idx = msg.sample_Idx;
			}

			// Message topic
			msg.topic = "exploration";

			// If sample index is within the sampleSet data length
			if(sample_Idx < node.sampleSet_data.length)
			{
				// Retrieve sampleSet and round it to nearest integers
				sampleSet = node.sampleSet_data[sample_Idx].slice(0).map(function(x){return Math.round(x)});

				// Construct control header string
				var s = 0;
				var parameters = [];
				for(var uid_Idx in node.uid_array)
				{
					var uid   = node.uid_array[uid_Idx];
					var type  = node.PUT[uid].control_hdr.type;
					var len   = node.PUT[uid].control_hdr.len;
					var value = int2hex(sampleSet[s], len);
					var control_hdr = {uid: uid, type: type, len: len, value : value};

					// Populate design parameters
					var ptsFiles = node.PUT[uid].ptsFiles;
					for (var i = 0; i < ptsFiles.length; i++)
					{
						// Check if current ptsFile is registered
						var ptsFile = ptsFiles[i];
						for (var j = 0; j < parameters.length; j++)
							if(parameters[j].ptsFile === ptsFile)
								break;
						// Current ptsFile is not registered
						if(j === parameters.length)
							parameters.push({ ptsFile : ptsFile, opcode : 1, control_hdr : [control_hdr]});
						// Current ptsFile is registered. Append a new control header on it
						else
							parameters[j].control_hdr.push(control_hdr);
					}
					// Increment sampleSet array counter
					s++;
				}

				// Send configuration messages to the next block
				if(parameters.length > 0)
				{
					msg.payload = parameters;
					node.send([msg, null]);
					node.status({});
				}
				else
				{
					msg.payload = "file-search: empty parameter list";
					node.send([null, msg]);
					node.status({});
				}
			}
			else
			{
				msg.payload = "file-search: sample_Idx exceeded PUT limit";
				node.send([null, msg]);
				node.status({});
			}
		});
	}
	RED.nodes.registerType("file-search",file_search);
}
