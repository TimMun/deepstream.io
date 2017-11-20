"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const utils_1 = require("../utils/utils");
const json_path_1 = require("./json-path");
const record_request_1 = require("./record-request");
class RecordTransition {
    constructor(name, config, services, recordHandler, metaData) {
        this.metaData = metaData;
        this.name = name;
        this.config = config;
        this.services = services;
        this.recordHandler = recordHandler;
        this.steps = [];
        this.recordRequestMade = false;
        this.record = null;
        // this.currentStep = null
        this.lastVersion = null;
        this.lastError = null;
        this.existingVersions = [];
        this.isDestroyed = false;
        this.pendingUpdates = {};
        this.ending = false;
        this.writeAckSockets = new Map();
        this.pendingCacheWrites = 0;
        this.pendingStorageWrites = 0;
        this.onCacheResponse = this.onCacheResponse.bind(this);
        this.onStorageResponse = this.onStorageResponse.bind(this);
        this.onRecord = this.onRecord.bind(this);
        this.onFatalError = this.onFatalError.bind(this);
    }
    /**
     * Checks if a specific version number is already processed or
     * queued for processing
     */
    hasVersion(version) {
        if (this.lastVersion === null) {
            return false;
        }
        return version !== -1 && version <= this.lastVersion;
    }
    /**
     * Send version exists error if the record has been already loaded, else
     * store the version exists error to send to the sockerWrapper once the
     * record is loaded
     */
    sendVersionExists(step) {
        const socketWrapper = step.sender;
        if (this.record) {
            socketWrapper.sendMessage({
                topic: constants_1.TOPIC.RECORD,
                action: constants_1.RECORD_ACTIONS.VERSION_EXISTS,
                originalAction: step.message.action,
                name: this.name,
                version: this.record._v,
                parsedData: this.record._d,
                isWriteAck: false,
            });
            this.services.logger.warn(constants_1.RECORD_ACTIONS.VERSION_EXISTS, `${socketWrapper.user} tried to update record ${this.name} to version ${step.message.version} but it already was ${this.record._v}`, this.metaData);
        }
        else {
            this.existingVersions.push({
                sender: socketWrapper,
                message: step.message,
            });
        }
    }
    /**
     * Adds a new step (either an update or a patch) to the record. The step
     * will be queued or executed immediatly if the queue is empty
     *
     * This method will also retrieve the current record's data when called
     * for the first time
     */
    add(socketWrapper, message, upsert) {
        const version = message.version;
        const update = {
            message,
            sender: socketWrapper,
        };
        const result = socketWrapper.parseData(message);
        if (result instanceof Error) {
            socketWrapper.sendMessage({
                topic: constants_1.TOPIC.RECORD,
                action: constants_1.RECORD_ACTIONS.INVALID_MESSAGE_DATA,
                data: message.data
            });
            return;
        }
        if (message.action === constants_1.RECORD_ACTIONS.UPDATE) {
            if (!utils_1.isOfType(message.parsedData, 'object') && !utils_1.isOfType(message.parsedData, 'array')) {
                socketWrapper.sendMessage(Object.assign({}, message, {
                    action: constants_1.RECORD_ACTIONS.INVALID_MESSAGE_DATA,
                    originalAction: message.action
                }));
                return;
            }
        }
        if (this.lastVersion !== null && this.lastVersion !== version - 1) {
            this.sendVersionExists(update);
            return;
        }
        if (version !== -1) {
            this.lastVersion = version;
        }
        this.steps.push(update);
        if (this.recordRequestMade === false) {
            this.recordRequestMade = true;
            record_request_1.default(this.name, this.config, this.services, socketWrapper, record => this.onRecord(record, upsert), this.onCacheResponse, this, this.metaData);
        }
        else if (this.steps.length === 1) {
            this.next();
        }
    }
    /**
     * Destroys the instance
     */
    destroy(error) {
        if (this.isDestroyed) {
            return;
        }
        if (error) {
            this.sendWriteAcknowledgementErrors(error.toString());
        }
        this.recordHandler.transitionComplete(this.name);
        this.isDestroyed = true;
    }
    /**
     * Callback for successfully retrieved records
     */
    onRecord(record, upsert) {
        if (record === null) {
            if (!upsert) {
                this.onFatalError(new Error(`Received update for non-existant record ${this.name}`));
                return;
            }
            this.record = { _v: 0, _d: {} };
        }
        else {
            this.record = record;
        }
        this.flushVersionExists();
        this.next();
    }
    /**
     * Once the record is loaded this method is called recoursively
     * for every step in the queue of pending updates.
     *
     * It will apply every patch or update and - once done - either
     * call itself to process the next one or destroy the RecordTransition
     * of the queue has been drained
     */
    next() {
        if (this.isDestroyed === true) {
            return;
        }
        if (this.record === null) {
            return;
        }
        const currentStep = this.steps.shift();
        if (!currentStep) {
            this.destroy(null);
            return;
        }
        this.currentStep = currentStep;
        let message = currentStep.message;
        if (message.version === -1) {
            message = Object.assign({}, message, { version: this.record._v + 1 });
            currentStep.message = message;
        }
        if (this.record._v !== message.version - 1) {
            this.sendVersionExists(currentStep);
            this.next();
            return;
        }
        this.record._v = message.version;
        if (message.path) {
            json_path_1.setValue(this.record._d, message.path, message.parsedData);
        }
        else {
            this.record._d = message.parsedData;
        }
        /*
       * Please note: saving to storage is called first to allow for synchronous cache
       * responses to destroy the transition, it is however not on the critical path
       * and the transition will continue straight away, rather than wait for the storage response
       * to be returned.
       *
       * If the storage response is asynchronous and write acknowledgement is enabled, the transition
       * will not be destroyed until writing to storage is finished
       */
        if (!this.config.storageExclusion || !this.config.storageExclusion.test(this.name)) {
            this.pendingStorageWrites++;
            if (message.isWriteAck) {
                this.setUpWriteAcknowledgement(message, this.currentStep.sender);
                this.services.storage.set(this.name, this.record, error => this.onStorageResponse(error, this.currentStep.sender, message), this.metaData);
            }
            else {
                this.services.storage.set(this.name, this.record, this.onStorageResponse, this.metaData);
            }
        }
        this.pendingCacheWrites++;
        if (message.isWriteAck) {
            this.setUpWriteAcknowledgement(message, this.currentStep.sender);
            this.services.cache.set(this.name, this.record, error => this.onCacheResponse(error, this.currentStep.sender, message), this.metaData);
        }
        else {
            this.services.cache.set(this.name, this.record, this.onCacheResponse, this.metaData);
        }
    }
    setUpWriteAcknowledgement(message, socketWrapper) {
        const correlationId = message.correlationId;
        const response = this.writeAckSockets.get(socketWrapper);
        if (!response) {
            this.writeAckSockets.set(socketWrapper, { [correlationId]: 1 });
            return;
        }
        response[correlationId] = response[correlationId] ? ++response[correlationId] : 1;
        this.writeAckSockets.set(socketWrapper, response);
    }
    /**
     * Send all the stored version exists errors once the record has been loaded.
     */
    flushVersionExists() {
        for (let i = 0; i < this.existingVersions.length; i++) {
            this.sendVersionExists(this.existingVersions[i]);
        }
        this.existingVersions = [];
    }
    handleWriteAcknowledgement(error, socketWrapper, originalMessage) {
        const correlationId = originalMessage.correlationId;
        const response = this.writeAckSockets.get(socketWrapper);
        if (!response) {
            console.log('unkown socket write ack');
            return;
        }
        response[correlationId]--;
        if (response[correlationId] === 0) {
            socketWrapper.sendMessage({
                topic: constants_1.TOPIC.RECORD,
                action: constants_1.RECORD_ACTIONS.WRITE_ACKNOWLEDGEMENT,
                // originalAction: originalMessage.action,
                name: originalMessage.name,
                correlationId
            });
            delete response[correlationId];
        }
        if (Object.keys(response).length === 0) {
            this.writeAckSockets.delete(socketWrapper);
        }
    }
    /**
     * Callback for responses returned by cache.set(). If an error
     * is returned the queue will be destroyed, otherwise
     * the update will be broadcast to other subscribers and the
     * next step invoked
     */
    onCacheResponse(error, socketWrapper, message) {
        if (message && socketWrapper) {
            this.handleWriteAcknowledgement(error, socketWrapper, message);
        }
        if (error) {
            this.onFatalError(error);
        }
        else if (this.isDestroyed === false) {
            delete this.currentStep.message.isWriteAck;
            delete this.currentStep.message.correlationId;
            this.recordHandler.broadcastUpdate(this.name, this.currentStep.message, false, this.currentStep.sender);
            this.next();
        }
        else if (this.steps.length === 0 && this.pendingCacheWrites === 0 && this.pendingStorageWrites === 0) {
            this.destroy(null);
        }
    }
    /**
     * Callback for responses returned by storage.set()
     */
    onStorageResponse(error, socketWrapper, message) {
        if (message && socketWrapper) {
            this.handleWriteAcknowledgement(error, socketWrapper, message);
        }
        if (error) {
            this.onFatalError(error);
        }
        else if (this.steps.length === 0 && this.pendingCacheWrites === 0 && this.pendingStorageWrites === 0) {
            this.destroy(null);
        }
    }
    /**
     * Sends all write acknowledgement messages at the end of a transition
     */
    sendWriteAcknowledgementErrors(errorMessage) {
        for (const [socketWrapper, pendingWrites] of this.writeAckSockets) {
            for (const correlationId in pendingWrites) {
                socketWrapper.sendMessage({
                    topic: constants_1.TOPIC.RECORD, action: constants_1.RECORD_ACTIONS.RECORD_UPDATE_ERROR, reason: errorMessage, correlationId
                });
            }
        }
        this.writeAckSockets.clear();
    }
    /**
     * Generic error callback. Will destroy the queue and notify the senders of all pending
     * transitions
     */
    onFatalError(error) {
        if (this.isDestroyed === true) {
            return;
        }
        this.services.logger.error(constants_1.RECORD_ACTIONS[constants_1.RECORD_ACTIONS.RECORD_UPDATE_ERROR], error.toString(), this.metaData);
        for (let i = 0; i < this.steps.length; i++) {
            if (!this.steps[i].sender.isRemote) {
                this.steps[i].sender.sendMessage({
                    topic: constants_1.TOPIC.RECORD,
                    action: constants_1.RECORD_ACTIONS.RECORD_UPDATE_ERROR,
                    name: this.steps[i].message.name
                });
            }
        }
        this.destroy(error);
    }
}
exports.default = RecordTransition;
//# sourceMappingURL=record-transition.js.map