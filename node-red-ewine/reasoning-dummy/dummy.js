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

	function dummy(n)
	{
		RED.nodes.createNode(this,n);
		this.max_iter = parseInt(n.max_iter);
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

			msg = {};
			msg.sample_Idx = sample_Idx + 1;

			node.status({});
			node.send([msg, null, null]);
		});
	}
	RED.nodes.registerType("dummy",dummy);
}
