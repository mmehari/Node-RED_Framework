/**
 * Copyright 2013,2015 IBM Corp.
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
	var net = require('net');

	function tcpClient(n)
	{
		RED.nodes.createNode(this,n);
		this.host = n.host;
		this.port = parseInt(n.port);
		this.timeout = parseInt(n.timeout);
		this.client_disconnects = n.client_disconnects;
		var node = this;

		this.on('input', function(msg)
		{
			node.status({fill:"green", shape:"dot", text:"executing"});

			var buffer = "";
			var topic = msg.topic;
			var client = new net.Socket();
			var client_timedout = false;

			// An incoming message port takes precedence over node configuration
			if(typeof(msg.port) !== "undefined")
				node.port = parseInt(msg.port);

			// An incoming message timeout takes precedence over node configuration
			if(typeof(msg.timeout) !== "undefined")
				node.timeout = parseInt(msg.timeout);

			// Connect to the server and send the message
			client.connect(node.port, node.host, function()
			{
				// Send stringified message
				client.write(msg.payload);

				// Configure client timeout and watch it over
				client.setTimeout(node.timeout);
				client.on('timeout', function()
				{
					// Request has timed out
					var msg = {payload: "request timeout", topic: topic};
					node.status({});
					node.send([null, msg]);

					// Close connection
					client_timedout = true;
					client.destroy();
				});
			});
			client.on('data', function (data)
			{
				buffer = buffer + data;

				// Client starts disconnection
				if(node.client_disconnects === true)
				{
					var newline_pos = buffer.indexOf('\n');
					if(newline_pos != -1)
					{
						var msg = {payload: buffer.substring(0, newline_pos+1), topic: topic};
						node.status({});
						node.send([msg, null]);

						// Close connection
						client.destroy();
					}
				}
			});
			client.on('close', function()
			{
				// Server starts disconnection
				if(node.client_disconnects === false && client_timedout === false)
				{
					var msg = {payload: buffer.toString(), topic: topic};
					node.status({});
					node.send([msg, null]);
				}
			});
			client.on('error', function(err)
			{
				node.log(err);
			});
		});
	}
	RED.nodes.registerType("tcpClient",tcpClient);
}
