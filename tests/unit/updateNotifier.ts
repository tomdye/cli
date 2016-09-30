import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as mockery from 'mockery';
import { SinonStub, stub } from 'sinon';

let updateNotifier: any;
const notifyStub: SinonStub = stub();
const updateNotifierStub: SinonStub = stub().returns({ 'notify': notifyStub });
const testPkg = { 'testKey': 'testValue' };
const testInterval = 100;

registerSuite({
	name: 'updateNotifier',
	'setup'() {
		mockery.enable({
			warnOnUnregistered: false
		});

		mockery.registerMock('update-notifier', updateNotifierStub);

		updateNotifier = require('intern/dojo/node!./../../src/updateNotifier').default;
	},
	'beforeEach'() {
		notifyStub.reset();
		updateNotifierStub.reset();
	},
	'teardown'() {
		mockery.deregisterAll();
		mockery.disable();
	},
	'Should call update-notifier with the passed arguments'() {
		updateNotifier(testPkg, testInterval);
		assert.isTrue(updateNotifierStub.calledOnce);
		assert.isTrue(updateNotifierStub.firstCall.calledWith({
			'pkg': testPkg,
			'updateCheckInterval': testInterval
		}));
	},
	'Should default interval to zero if none passed'() {
		updateNotifier(testPkg);
		assert.isTrue(updateNotifierStub.calledOnce);
		assert.isTrue(updateNotifierStub.firstCall.calledWith({
			'pkg': testPkg,
			'updateCheckInterval': 0
		}));
	},
	'Should call notify function once notifier is set up'() {
		updateNotifier(testPkg, testInterval);
		assert.isTrue(updateNotifierStub.calledOnce);
		assert.isTrue(notifyStub.calledOnce);
		assert.isTrue(notifyStub.calledAfter(updateNotifierStub));
	}
});
