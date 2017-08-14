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
	var regression = require("regression");

	function analysis(n)
	{
		RED.nodes.createNode(this,n);

		this.analysis_type = n.analysis_type;
		var node = this;

		this.on("input", function(msg)
		{
			node.status({fill:"green", shape:"dot", text:"executing"});

			var Msrmt_files = msg.payload;

			// Statistical analysis
			if(node.analysis_type === "statistics")
			{
			}
			// regression analysis
			else if(node.analysis_type === "regression")
			{
				var regression_array = [];

				var i = 0;
				var refreshIntervalId = setInterval(function()
				{
					var filename = Msrmt_files[i].filename;
					fs.readFile(filename, {}, function(err, content)
					{
						var regression_str = "";
						if(err)
						{
							node.status({fill:"red", shape:"dot", text:"Error"});
							node.send([null, null, {error: err}]);
						}
						else
						{
							// Convert buffer to string
							content = content.toString();

							// Regression calculation
							var dataset_array = content.split('\n').filter(function(e){return e;});
							var data = [];
							for(var i = 1; i < dataset_array.length; i++)
							{
								var dataset = dataset_array[i].split('\t');
								if(Number.isInteger(parseInt(dataset[2])) === true)
								{
									data.push([parseInt(dataset[0]), parseInt(dataset[2])]);
								}
							}

							if(data.length >= 2)
							{
								var result = regression('linear', data);
								var regression_str = result.string;
							}
						}
						regression_array.push(regression_str);

						// Are all regression calculations done?
						if(regression_array.length >= Msrmt_files.length)
						{
							msg.sample_Idx = msg.sample_Idx + 1;
							msg.regresion = regression_array;
							delete msg.payload;
							delete msg.topic;

							node.status({});
							node.send([msg, null, null]);
						}
					});

					if(i == Msrmt_files.length - 1)
						clearInterval(refreshIntervalId);

					i++;
				}, 10);
			}
		});
	}
	RED.nodes.registerType("analysis",analysis);
}
