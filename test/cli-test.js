'use strict';

var path = require('path');
var child_process = require('child_process');
var fs = require('fs');
var chai = require('chai');
chai.use(require('chai-json-schema'));
var expect = chai.expect;

/**
 * Use the command line interface.
 * @param {String|Array} args
 * @param {String} [stdin]
 * @returns {Array.<String>} [stdout, stderr]
 */
function runCli(args, stdin) {
	if (typeof args === 'string') {
 		args = args.split(' ');
	}
	var response,
		options = {};
	args.unshift('./bin/cli.js');
	if (stdin) {
		options.input = stdin;
	}
	response = child_process.spawnSync('node', args, options);

	// the "logger" in console.js actually writes to stderr
	// so just print these out instead of failing
	const errors = response.stderr.toString('utf8')
	if (errors) {
		console.error(errors)
	}

	return response.stdout.toString('utf8');
}

function runTestServer() {
	return child_process.spawn('node', ['./test/test-server.js']);
}

var inputLocalPath = __dirname + '/fixtures/json/valid.json',
	inputRemotePath =  'http://localhost:9002/valid',
	//'https://raw.githubusercontent.com/krg7880/json-schema-generator/master/test/fixtures/json/valid.json',
	inputJSONString = fs.readFileSync(inputLocalPath, 'utf8'),
	inputJSON = JSON.parse(inputJSONString);

describe('Cli', function() {
	let server
	before(function () {
		server = runTestServer()
	});

	after(function () {
		server.kill('SIGINT')
	});

	it('Should be able to read a local file', function() {
		const schemaJSON = JSON.parse(runCli(inputLocalPath));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
	});

	it('Should be able to read a remote file', () => {
		this.timeout(5000);

		const schemaJSON = JSON.parse(runCli(inputRemotePath));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
	});

	it('Should be able to read stdin', function() {
		const schemaJSON = JSON.parse(runCli([], inputJSONString));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
	});

	it('Should be able to write to a file', function() {
		fs.rmSync('./test/_file.json', { force: true })
		runCli([inputLocalPath, '-o', './test/_file.json']);
		const schemaJSON = JSON.parse(fs.readFileSync('./test/_file.json', 'utf8'));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
		fs.unlinkSync('./test/_file.json');
	});

	it('Should be able to write into a directory', function() {
		fs.rmSync('./test/fixtures/valid.json', { force: true })
		runCli([inputLocalPath, '--schemadir', './test/fixtures']);
		const schemaJSON = JSON.parse(fs.readFileSync('./test/fixtures/valid.json', 'utf8'));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
		fs.unlinkSync('./test/fixtures/valid.json');
	});

	it('Should create subdirectories if necessary', function() {
		fs.rmSync('./test/fixtures/var/valid.json', { force: true })
		runCli([inputLocalPath, '--schemadir', './test/fixtures/var/']);
		const schemaJSON = JSON.parse(fs.readFileSync('./test/fixtures/var/valid.json'));
		expect(inputJSON).to.be.jsonSchema(schemaJSON);
		fs.unlinkSync('./test/fixtures/var/valid.json');
		fs.rmdirSync('./test/fixtures/var');
	});

	it('Should be able to create a copy of source', function() {
		fs.rmSync('./test/fixtures/var/valid.json', { force: true })
		runCli([inputLocalPath, '--jsondir', './test/fixtures/var/']);
		const copyJSON = JSON.parse(fs.readFileSync('./test/fixtures/var/valid.json'));
		expect(inputJSON).to.be.deep.equal(copyJSON);
		fs.unlinkSync('./test/fixtures/var/valid.json');
		fs.rmdirSync('./test/fixtures/var');
	});
});
