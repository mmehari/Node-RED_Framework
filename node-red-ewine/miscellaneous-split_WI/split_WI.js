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

	function split_WI(n)
	{
		RED.nodes.createNode(this,n);
		this.splt = (n.splt || "\\n").replace(/\\n/,"\n").replace(/\\r/,"\r").replace(/\\t/,"\t").replace(/\\e/,"\e").replace(/\\f/,"\f").replace(/\\0/,"\0");
		this.complete = (n.complete || "payload").toString();
		this.intval = n.intval;
		var node = this;

		this.on("input", function(msg)
		{
			if(node.complete === "true")
				node.input = msg;
			else if(node.complete === "false")
				node.input = msg["payload"];
			else
				node.input = msg[node.complete];

			var payload = node.input;

			if ((typeof payload === "object") && !Buffer.isBuffer(payload))
			{
				var keys = Object.keys(payload);

				var i = 0;
				var refreshIntervalId = setInterval(function()
				{
					if (payload.hasOwnProperty(keys[i]))
					{
						node.send(RED.util.cloneMessage(payload[keys[i]]));
					}

					if(i == keys.length - 1)
						clearInterval(refreshIntervalId);
					i++;
				}, node.intval);
			}
			else
			{
				if (typeof payload === "string") // Split String into array
				{
					payload = payload.split(node.splt);
				}

				// then split array into messages
				if (Array.isArray(payload))
				{
					var i = 0;
					var refreshIntervalId = setInterval(function()
					{
						node.send(RED.util.cloneMessage(payload[i]));

						if(i == a.length - 1)
							clearInterval(refreshIntervalId);

						i++;
					}, node.intval);
				}
			}

		});
	}
	RED.nodes.registerType("split_WI",split_WI);
}
