/**
 * Copyright 2013, 2015 IBM Corp.
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
	var os = require("os");

	function Mfile_out(n)
	{
		RED.nodes.createNode(this,n);
		this.appendNewline = n.appendNewline;
		this.overwriteFile = n.overwriteFile.toString();
		var node = this;

		this.on("input",function(msg)
		{
			var content_array = msg.payload;
			var content_count = msg.payload.length;

			var payload = [];
			for(var i = 0; i < content_count; i++)
			{
				var content = content_array[i];

				var filename = content.filename || "";
				if (filename === "")
				{
					node.warn("no file name specified");
				}
				else if (content.hasOwnProperty("payload") && (typeof content.payload !== "undefined"))
				{
					var data = content.payload;
					if ((typeof data === "object") && (!Buffer.isBuffer(data)))
					{
						data = JSON.stringify(data);
					}
					else if (typeof data === "boolean")
					{
						data = data.toString();
					}
					else if (typeof data === "number")
					{
						data = data.toString();
					}

					if ((this.appendNewline) && (!Buffer.isBuffer(data)))
					{
						data += os.EOL;
					}

					data = new Buffer(data);
					if (this.overwriteFile === "true")
					{
						fs.writeFile(filename, data, "binary", function (err)
						{
							if (err)
							{
								node.error(RED._("write failed", {error:err.toString()}), content);
							}
							else
							{
								// Decrease content count after being overwritten
								content_count--;
								// If all contents are written to files
								if(content_count === 0)
								{
									node.send(msg);
									node.status({});
								}
							}
						});
					}
					else
					{
						fs.appendFile(filename, data, "binary", function (err)
						{
							if (err)
							{
								node.error(RED._("append failed", {error:err.toString()}), content);
							}
							else
							{
								// Decreate content count after being appended
								content_count--;
								// If all contents are written to files
								if(content_count === 0)
								{
									node.send(msg);
									node.status({});
								}
							}
						});
					}
				}
			}
		});
		this.on('close', function()
		{
			node.status({});
		});
	}
	RED.nodes.registerType("Mfile_out",Mfile_out);

	function Mfile_in(n)
	{
		RED.nodes.createNode(this,n);
		this.format = n.format;
		var node = this;

		var options = {};
		if (this.format)
			options['encoding'] = this.format;

		this.on("input",function(msg)
		{
			var filename_array = msg.filenames;

			var payload = [];
			for(var i = 0; i < msg.filenames.length; i++)
			{
				var filename = filename_array[i];
				if (filename === "")
				{
					node.warn("no file name specified");
				}
				else
				{
					var data = fs.readFileSync(filename,options);
					payload.push({filename: filename, payload: data});
				}
			}
			node.status({});
			node.send({payload: payload});
			
		});
		this.on('close', function()
		{
			node.status({});
		});
	}
	RED.nodes.registerType("Mfile_in",Mfile_in);
}
