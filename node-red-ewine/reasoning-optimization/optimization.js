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

	function optimization(n)
	{
		RED.nodes.createNode(this,n);
		this.outCol_Idx = n.outCol_Idx;
		this.max_iter = parseInt(n.max_iter);
		this.HV_PoI_threshold = parseFloat(n.HV_PoI_threshold);
		var node = this;

		this.on("input", function(msg)
		{
			// sample index
			var sample_Idx = msg.sample_Idx;

			// Stopping criteria definition
			if(sample_Idx >= node.max_iter)
			{
				msg = {};
				msg.topic = "experiment_finished";

				node.status({});
				node.send([null, msg, null]);
			}

			// Exploration phase
			if(msg.topic == "exploration")
			{
				msg = {};
				msg.sample_Idx = sample_Idx + 1;

				node.status({});
				node.send([msg, null, null]);
			}
			// Exploitation phase
			else if(msg.topic == "exploitation")
			{
				node.status({fill:"green", shape:"dot", text:"executing"});

				// matlabd argument list
				var arg = "[newSample HV_PoI] = BMoptMOSBO('" + msg.payload.filename + "', [" + node.outCol_Idx + "])";
				arg = arg.match(/(?:[^\s"]+|"[^"]*")+/g);

				// Run the SUMO optimizer using matlab daemon
				node.child = spawn("matlabd", arg);

				// SUMO sends normal data
				node.child.stdout.on('data', function (data)
				{
					// buf2str
					data = data.toString();

					// Parse and store sampleSet parameter
					var sampleSet = data.substring(data.lastIndexOf("newSample =") + 11, data.lastIndexOf("HV_PoI =")).trim().split(" ").filter(function(e){return e;});

					// Parse and store Hyper Volume Probability of Improvement (HV_PoI) parameter
					var HV_PoI = parseFloat(data.substring(data.lastIndexOf("HV_PoI =") + 8).trim());

					// HV_PoI stopping criterion met
					msg = {};
					if(HV_PoI <= node.HV_PoI_threshold)
					{
						msg.topic = "experiment_finished";

						node.status({});
						node.send([null, msg, null]);
					}
					else
					{
						msg.sample_Idx = sample_Idx + 1;
						msg.payload    = sampleSet;
						msg.HV_PoI     = HV_PoI;

						node.status({});
						node.send([msg, null, null]);
					}
				});

				// SUMO sends error data
				node.child.stderr.on('data', function (data)
				{
					var msg = {payload: data.toString()};

					node.status({fill:"red", shape:"dot", text:"SUMO stderr"});
					node.send([null, null, msg]);
				});

				node.child.on('close', function (code)
				{
					node.child = null;
				});

				// matlabd execution error
				node.child.on('error', function (err)
				{
					if(err.errno === "ENOENT")
						node.warn('SUMO: command not found');
					else if(err.errno === "EACCES")
						node.warn('SUMO: command not executable');
					else
						node.log('SUMO: error: ' + err);
				});
			}
		});
	}
	RED.nodes.registerType("optimization",optimization);
}
