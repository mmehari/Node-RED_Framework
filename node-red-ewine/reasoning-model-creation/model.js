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

	// Function to calculate population standard deviation
	function STDEV(data_array, window_len)
	{
		var i, j;

		// Number of performance objectives
		var perf_obj_count = data_array[0].length;

		var stdev_array = [];
		for(i = 0; i < perf_obj_count; i++)
		{
			// Retreive data for a maximum of window_len elements
			var data = [];
			for(j = data_array.length - 1; j >= (data_array.length - window_len); j--)
				data.push(parseFloat(data_array[j][i]));

			// Calculate mean
			var sum = 0;
			for(j = 0; j < window_len; j++)
				sum = sum + data[j];
			var mean = sum/window_len;

			// Calculation variance
			var var_sum = 0;
			for(j = 0; j < window_len; j++)
				var_sum = var_sum + Math.pow((data[j] - mean), 2);
			var variance = var_sum/window_len;

			// Calculate standard daviation
			var stdev = Math.sqrt(variance);

			// Push standard deviation value into an array
			stdev_array.push(stdev);
		}

		return stdev_array;
	}

	function model_creation(n)
	{
		RED.nodes.createNode(this,n);
		this.outCol_Idx = n.outCol_Idx;
		this.max_iter = parseInt(n.max_iter);
		this.cv_folds = parseInt(n.cv_folds);
		this.cv_iter  = parseInt(n.cv_iter);
		this.cv_std_thold = parseFloat(n.cv_std_thold);
		this.cv_std_width = parseFloat(n.cv_std_width);

		this.cv_score_array = [];
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
				var arg = "[newSamples, cv_score] = BMsumo('" + msg.payload.filename + "', [" + node.outCol_Idx + "], 10, " + node.cv_folds + ", " + node.cv_iter +")";
				arg = arg.match(/(?:[^\s"]+|"[^"]*")+/g);

				// Run the SUMO optimizer using matlab daemon
				node.child = spawn("matlabd", arg);

				// SUMO sends normal data
				node.child.stdout.on('data', function (data)
				{
					// buf2str
					data = data.toString();

					// Parse and store sampleSet parameter
					var sampleSet = data.substring(data.lastIndexOf("newSamples =") + 12, data.lastIndexOf("cv_score =")).trim().split(" ").filter(function(e){return e;});

					// Parse and store cross validation score parameters
					var cv_score = data.substring(data.lastIndexOf("cv_score =") + 10).trim().split(" ").filter(function(e){return e;});
					node.cv_score_array.push(cv_score);

					// Do we have enough measurment for standard deviation calculation?
					msg = {};
					if(node.cv_score_array.length >= node.cv_std_width)
					{
						// Calculate standard deviation of the cross validation score
						var cv_std_array = STDEV(node.cv_score_array, node.cv_std_width);

						// cross validation stopping criterion met
						if(cv_std_array.every( function(cv_std){return cv_std <= node.cv_std_thold} ))
						{
							msg.topic = "experiment_finished";
							msg.cv_score = cv_score;
							msg.cv_std   = cv_std_array;

							node.status({});
							node.send([null, msg, null]);
						}
						else
						{
							msg.sample_Idx = sample_Idx + 1;
							msg.payload  = sampleSet;
							msg.cv_score = cv_score;
							msg.cv_std   = cv_std_array;

							node.status({});
							node.send([msg, null, null]);
						}
					}
					else
					{
						msg.sample_Idx = sample_Idx + 1;
						msg.payload  = sampleSet;
						msg.cv_score = cv_score;

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
	RED.nodes.registerType("model-creation",model_creation);
}
