#!/usr/bin/env node

console.log('Node');

var url = require('url'),
	path = require('path'),
	cliConsole = require('../lib/cli/console'),
	IOType = require('../lib/cli/io-type'),
	stdout = cliConsole.stdout,
	errorHandler = cliConsole.errorHandler;

var usageText = [
	//"Extract a json-schema from a json document.",
	"If <target> is specified, it is interpreted as follows: a protocol (like http://) ",
	"means url; anything else is treated as path to a local file. ",
	"If no input file is specified and stdin is provided, stdin is used.",
	"",
	"Options:",
	"  --stdin          Use stdin as input.",
	"  --url            Remote json document to use as input.",
	"  --file           Local json document to use as input.",
	"  --schemadir, -o  Directory (or file, if ending with .json) where the schema will be stored.",
	"  --jsondir        Directory (or file, if ending with .json) where the source document is copied to. Useful with --url.",
	"  --pretty         Whether to use pretty json format. Use --no-pretty for false. Default True.",
	"  --force, -f      If a destination file already exists, overwrite it.",
	"  --help, -h       Show this help text."
].join('\n'),
	minimist = require('minimist'),
	argv = minimist(process.argv.slice(2),
		{
			boolean: ['pretty', 'force', 'stdin'],
			default: {'pretty': true},
			alias: {'force': 'f', 'help': 'h', 'schemadir': 'o'},
		});

/**
 * @see http://tools.ietf.org/html/draft-fge-json-schema-validation-00#page-13
 */

function createConfig(argv) {
	var arg,
		argVal,
		config = {
			src: {
				type: null,
				path: null
			},
			dest: {
				type: IOType.STDOUT,
				path: null,
				defaultFileName: null,
				pretty: true,
				force: false
			},
			copy: {
				type: IOType.OMIT,
				path: null,
				defaultFileName: null,
				pretty: true,
				force: false
			}
		};

	for (arg in argv) {
		argVal = argv[arg];
		switch (arg) {
			case "0":
			case "stdin":
				if (argVal) {
					config.src.type = IOType.STDIN;
				}
				break;
			case "file":
				config.src.type = IOType.FILE;
				config.src.path = argv.file;
				break;
			case "url":
				config.src.type = IOType.URL;
				config.src.path = argv.url;
				break;
			case "_":
				if (argVal.length > 0) {
					argVal = url.parse(argVal[0]);
					if (argVal.hostname) {
						// if url thinks it has a host then I agree
						config.src.type = IOType.URL;
						config.src.path = argVal.href;
					} else {
						// all else is local file dest
						config.src.type = IOType.FILE;
						config.src.path = argVal.href;
					}
				}
				break;
			case "jsondir":
				config.copy.type = IOType.FILE;
				config.copy.path = argVal;
				break;
			case "o":
			case "schemadir":
				config.dest.type = IOType.FILE;
				config.dest.path = argVal;
				break;
			case "f":
			case "force":
				config.dest.force = config.copy.force = argVal;
				break;
			case "pretty":
				config.dest.pretty = config.copy.pretty = argVal;
				break;
			case "h":
			case "help":
				// You asked for it, so stdout it is.
				stdout(usageText);
				process.exit(0);
				break;
		}
	}
	if (config.src.path) {
		config.dest.defaultFileName = config.copy.defaultFileName = getName(config.src.path);
	}
	if (!config.src.type && !process.stdin.isTTY) {
		config.src.type = IOType.STDIN;
	}
	return config;
}

/**
 * Get the name of the JSON resource so the schema
 * matches the source. The .json extension is added
 * if it's missing from the filename.
 *
 * @param {String} str File name
 * @return {String} The name of the file only.
 */
function getName(str) {
	var name = path.basename(str);
	if (name.lastIndexOf('.') === -1) {
		name += '.json';
	}
	return name;
}

var config = createConfig(argv);

// Cannot resolve without an input specification
if (!config.src.type) {
	errorHandler('Please specify a local file (path) or a URL of a JSON document' + '\n\n' + usageText);
}

// Don't load this unless clearly necessary
var jsonParser = require('json-promise'),
	jsonToSchema = require('../lib/index'),
	handleOutput = require('../lib/cli/out'),
	handleInput = require('../lib/cli/in');

// This triggers everything
handleInput(config.src, function(jsonString) {
	// Optionally copy source
	handleOutput(config.copy, jsonString);
	// Convert to schema
	jsonParser.parse(jsonString)
		.then(jsonToSchema)
		.then(jsonParser.stringify.bind(jsonParser))
		.then(function(jsonSchemaString) {
			// Save to dest
			handleOutput(config.dest, jsonSchemaString);
		})
		.catch(function(e) {
			console.log(e);
			errorHandler(e.toString('utf8'));
		});
});
