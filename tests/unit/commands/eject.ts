import { beforeEach, afterEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import MockModule from '../../support/MockModule';
import * as sinon from 'sinon';
import { yellow } from 'chalk';
require('sinon-as-promised')(Promise);

import { join, resolve as pathResolve } from 'path';

import { CommandsMap, CommandWrapper } from '../../../src/command';
import { getCommandWrapperWithConfiguration } from '../../support/testHelper';

describe('eject command', () => {
	const ejectPackagePath = join(pathResolve('.'), '/_build/tests/support/eject');
	let moduleUnderTest: any;
	let mockModule: MockModule;
	let mockPkgDir: any;
	let mockFsExtra: any;
	let mockInquirer: any;
	let mockNpmInstall: any;
	let mockPackageJson: any;
	let mockAllCommands: any;
	let consoleLogStub: sinon.SinonStub;
	let consoleWarnStub: sinon.SinonStub;
	let sandbox: sinon.SinonSandbox;

	function loadCommand(command: string): any {
		return require(`intern/dojo/node!${ejectPackagePath}/${command}`);
	}

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockModule = new MockModule('../../src/commands/eject');
		mockModule.dependencies(['inquirer', 'fs', 'fs-extra', 'pkg-dir', '../allCommands', '../npmInstall', `${ejectPackagePath}/package.json`]);
		mockPkgDir = mockModule.getMock('pkg-dir');
		mockPkgDir.ctor.sync = sandbox.stub().returns(ejectPackagePath);
		mockFsExtra = mockModule.getMock('fs-extra');
		mockFsExtra.copySync = sandbox.stub();
		mockInquirer = mockModule.getMock('inquirer');
		mockInquirer.prompt = sandbox.stub().resolves({ eject: true });
		mockAllCommands = mockModule.getMock('../allCommands');
		mockNpmInstall = mockModule.getMock('../npmInstall');
		mockPackageJson = mockModule.getMock(`${ejectPackagePath}/package.json`);
		consoleLogStub = sandbox.stub(console, 'log');
		consoleWarnStub = sandbox.stub(console, 'warn');
		moduleUnderTest = mockModule.getModuleUnderTest().default;
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('should register supported arguments', () => {
		const options = sandbox.stub();
		moduleUnderTest.register(options);
		assert.deepEqual(
			options.firstCall.args,
			[ 'g', {
				alias: 'group',
				describe: 'the group to eject commands from'
			} ]
		);
		assert.deepEqual(
			options.secondCall.args,
			[ 'c', {
				alias: 'command',
				describe: 'the command to eject - a `group` is required'
			} ]
		);
	});

	it(`should abort eject when 'N' selected`, () => {
		const abortOutput = 'Aborting eject';
		const commandMap: CommandsMap = new Map<string, CommandWrapper>();

		const helper = {command: 'eject'};
		mockInquirer.prompt = sandbox.stub().resolves({ eject: false });
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, {}).catch((error: { message: string }) => {
			assert.equal(error.message, abortOutput);
		});
	});

	it(`should warn when only eject and version are registered`, () => {
		const runOutput = 'No commands have implemented eject';
		const installedCommandWrapper1 = getCommandWrapperWithConfiguration({
			group: 'eject',
			name: ''
		});
		const installedCommandWrapper2 = getCommandWrapperWithConfiguration({
			group: 'version',
			name: ''
		});

		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['eject', installedCommandWrapper1],
			['version', installedCommandWrapper2]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, {}).then(() => {
			assert.equal(consoleLogStub.args[0][0], runOutput);
		});
	});

	it(`should warn if all commands are skipped`, () => {
		const runOutput = 'No commands have implemented eject';
		const installedCommandWrapper1 = getCommandWrapperWithConfiguration({
			group: 'command',
			name: ''
		});
		const installedCommandWrapper2 = getCommandWrapperWithConfiguration({
			group: 'version',
			name: ''
		});

		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['command', installedCommandWrapper1],
			['version', installedCommandWrapper2]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, {}).then(() => {
			assert.equal(consoleLogStub.args[0][0], runOutput);
		});
	});

	it(`should eject only the commands under 'group' passed in via 'group' argument`, () => {
		const appleCommand = {...loadCommand('command-with-full-eject')};
		const orangeCommand = {...loadCommand('command-with-full-eject')};
		const blueberryCommand = getCommandWrapperWithConfiguration({
			group: 'fruit',
			name: 'blueberry',
			eject: true
		});
		appleCommand.name = 'apple';
		orangeCommand.name = 'orange';
		const appleEjectStub = sandbox.stub(appleCommand, 'eject').returns({});
		const orangeEjectStub = sandbox.stub(orangeCommand, 'eject').returns({});
		const blueberryEjectStub = <sinon.SinonStub> blueberryCommand.eject;
		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['apple', appleCommand],
			['orange', orangeCommand],
			['blueberry', blueberryCommand]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, { group: 'test-group' }).then(() => {
			assert.isTrue(appleEjectStub.called, '1');
			assert.isTrue(orangeEjectStub.called, '2');
			assert.isFalse(blueberryEjectStub.called, '3');
		});
	});

	it(`should eject only the command passed in via the 'command' argument`, () => {
		const appleCommand = {...loadCommand('command-with-full-eject')};
		const orangeCommand = {...loadCommand('command-with-full-eject')};
		const blueberryCommand = getCommandWrapperWithConfiguration({
			group: 'fruit',
			name: 'blueberry',
			eject: true
		});
		appleCommand.name = 'apple';
		orangeCommand.name = 'orange';
		const appleEjectStub = sandbox.stub(appleCommand, 'eject').returns({});
		const orangeEjectStub = sandbox.stub(orangeCommand, 'eject').returns({});
		const blueberryEjectStub = <sinon.SinonStub> blueberryCommand.eject;
		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['apple', appleCommand],
			['orange', orangeCommand],
			['blueberry', blueberryCommand]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, { group: 'test-group', command: 'apple' }).then(() => {
			assert.isTrue(appleEjectStub.called);
			assert.isFalse(orangeEjectStub.called);
			assert.isFalse(blueberryEjectStub.called);
		});
	});

	it(`should error when 'eject' doesn't exist on command passed in via 'command' argument`, () => {
		const blueberryCommand = getCommandWrapperWithConfiguration({
			group: 'test-group',
			name: 'blueberry'
		});
		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['blueberry', blueberryCommand]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, { group: 'test-group', command: 'blueberry' }).catch((error: { message: string }) => {
			assert.equal(error.message, `'eject' is not defined for command test-group-blueberry`);
		});
	});

	it(`should error when command passed in via 'command' argument doesn't exist`, () => {
		const blueberryCommand = getCommandWrapperWithConfiguration({
			group: 'test-group',
			name: 'blueberry'
		});
		const commandMap: CommandsMap = new Map<string, CommandWrapper>([
			['blueberry', blueberryCommand]
		]);
		const helper = {command: 'eject'};
		mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
		return moduleUnderTest.run(helper, { group: 'test-group', command: 'apple' }).catch((error: { message: string }) => {
			assert.equal(error.message, `command test-group-apple does not exist`);
		});
	});

	describe('eject npm config', () => {
		it('should run npm install', () => {
			const commandMap: CommandsMap = new Map<string, CommandWrapper>([
				['apple', loadCommand('command-with-full-eject')]
			]);
			const helper = {command: 'eject'};
			mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
			return moduleUnderTest.run(helper, {}).then(() => {
				assert.isTrue(mockNpmInstall.installDependencies.calledOnce);
				assert.isTrue(mockNpmInstall.installDevDependencies.calledOnce);
			});
		});
	});

	describe('eject copy config', () => {
		it('should run copy files', () => {
			const commandMap: CommandsMap = new Map<string, CommandWrapper>([
				['apple', loadCommand('/command-with-full-eject')]
			]);
			const helper = {command: 'eject'};
			mockAllCommands.default = sandbox.stub().resolves({commandsMap: commandMap});
			return moduleUnderTest.run(helper, {}).then(() => {
				assert.isTrue(consoleLogStub.secondCall.calledWith(` ${yellow('creating')} ./config/test-group-test-eject/file1`));
				assert.isTrue(consoleLogStub.thirdCall.calledWith(` ${yellow('creating')} ./config/test-group-test-eject/file2`));
				assert.isTrue(mockFsExtra.copySync.calledTwice);
			});
		});
	});
});
