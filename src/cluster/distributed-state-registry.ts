import { EventEmitter } from 'events'
import { TOPIC, STATE_ACTIONS } from '../constants'
import { InternalDeepstreamConfig, DeepstreamServices } from '../types'
import { StateMessage } from '../../binary-protocol/src/message-constants'
import { Dictionary } from 'ts-essentials'

/**
 * This class provides a generic mechanism that allows to maintain
 * a distributed state amongst the nodes of a cluster. The state is an
 * array of unique strings in arbitrary order.
 *
 * Whenever a string is added by any node within the cluster for the first time,
 * an 'add' event is emitted. Whenever its removed by the last node within the cluster,
 * a 'remove' event is emitted.
 */
export class DistributedStateRegistry extends EventEmitter {
  private data = new Map<string, {
    localCount: number,
    nodes: Set<string>,
    checkSum: number
  }>()
  private reconciliationTimeouts = new Map()
  private checkSumTimeouts = new Map()
  private fullStateSent: boolean = false
  private isReady: boolean = false
  private initialServers = new Set<string>()
  private stateOptions: any

  /**
   * Initialises the DistributedStateRegistry and subscribes to the provided cluster topic
   */
  constructor (private topic: TOPIC, private options: InternalDeepstreamConfig, private services: DeepstreamServices) {
    super()
    this.services.message.subscribe(topic, this.processIncomingMessage.bind(this))
    this.stateOptions = options.plugins.state.options
    this.resetFullStateSent = this.resetFullStateSent.bind(this)
  }

  public whenReady (done: () => void) {
    if (this.isReady) {
      done()
    } else {
      this.once('ready', done)
    }
  }

  /**
   * Checks if a given entry exists within the registry
   */
  public has (name: string) {
    return this.data.has(name)
  }

  /**
   * Add a name/entry to the registry. If the entry doesn't exist yet,
   * this will notify the other nodes within the cluster
   */
  public add (name: string) {
    const data = this.data.get(name)
    if (!data) {
      this.addToServer(name, this.options.serverName)
      this.sendMessage(name, STATE_ACTIONS.ADD)
    } else {
      data.localCount++
    }
  }

  /**
   * Removes a name/entry from the registry. If the entry doesn't exist,
   * this will exit silently
   */
  public remove (name: string) {
    const data = this.data.get(name)
    if (data) {
      data.localCount--
      if (data.localCount === 0) {
        this.removeFromServer(name, this.options.serverName)
        this.sendMessage(name, STATE_ACTIONS.REMOVE)
      }
    }
  }

  /**
   * Informs the distributed state registry a server has been added to the cluster
   */
  public setServers (serverNames: string[]) {
    this.initialServers = new Set(serverNames)
    if (this.initialServers.size === 0) {
      this.isReady = true
      this.emit('ready')
    }
    this.initialServers.forEach((serverName) => this.onServerAdded(serverName))
  }

  /**
   * Informs the distributed state registry a server has been added to the cluster
   */
  public onServerAdded (serverName: string) {
    this._requestFullState(serverName)
  }

  /**
   * Removes all entries for a given serverName. This is intended to be called
   * whenever a node is removed from the cluster
   */
  public onServerRemoved (serverName: string) {
    for (const [, value] of this.data) {
      if (value.nodes.has(serverName)) {
        this.removeFromServer(name, serverName)
      }
    }
  }

  /**
   * Returns all the servers that hold a given state
   */
  public getAllServers (name: string) {
    const data = this.data.get(name)
    if (data) {
      return Object.keys(data.nodes)
    }
    return []
  }

  /**
   * Returns all currently registered entries
   */
  public getAll (serverName: string) {
    if (!serverName) {
      return this.data.keys()
    }
    const entries: string[] = []
    for (const [, value] of this.data) {
      if (value.nodes.has(serverName)) {
        entries.push(name)
      }
    }
    return entries
  }

  /**
   * Returns all currently registered entries as a map
   * @returns {Array} entries
   */
  public getAllMap () {
    return this.data
  }

  /**
   * Removes an entry for a given serverName. If the serverName
   * was the last node that held the entry, the entire entry will
   * be removed and a `remove` event will be emitted
   */
  private removeFromServer (name: string, serverName: string) {
    let exists = false

    const data = this.data.get(name)
    if (!data) {
      return
    }
    data.nodes.delete(serverName)

    // TODO
    for (const nodeName in data.nodes) {
      if (data.nodes.has(nodeName)) {
        exists = true
      }
    }

    if (exists === false) {
      this.data.delete(name)
      this.emit('remove', name)
    }

    this.emit('server-removed', name, serverName)
  }

  /**
   * Adds a new entry to this registry, either as a result of a remote or
   * a local addition. Will emit an `add` event if the entry wasn't present before
   */
  private addToServer (name: string, serverName: string) {
    let data = this.data.get(name)

    if (!data) {
      data = {
        localCount: 1,
        nodes: new Set(),
        checkSum: this.createCheckSum(name)
      }
      this.data.set(name, data)
      this.emit('add', name)
    }

    data.nodes.add(serverName)

    this.emit('server-added', name, serverName)
  }

  /**
   * Generic messaging function for add and remove messages
   */
  private sendMessage (name: string, action: STATE_ACTIONS) {
    this.services.message.sendState({
      topic: TOPIC.STATE_REGISTRY,
      registryTopic: this.topic,
      action,
      name
    })

    this.getCheckSumTotal(this.options.serverName, (checksum) =>
      this.services.message.sendState({
        topic: TOPIC.STATE_REGISTRY,
        registryTopic: this.topic,
        action: STATE_ACTIONS.CHECKSUM,
        parsedData: checksum
      })
    )
  }

  /**
   * This method calculates the total checkSum for all local entries of
   * a given serverName
   */
  private getCheckSumTotal (serverName: string, callback: (checksum: number) => void): void {
    const callbacks = this.checkSumTimeouts.get(serverName)
    if (callbacks) {
      callbacks.push(callback)
    } else {
      this.checkSumTimeouts.set(serverName, callback)

      setTimeout(() => {
        let totalCheckSum = 0

        for (const [, value] of this.data) {
          if (value.nodes.has(serverName)) {
            totalCheckSum += value.checkSum
          }
        }

        this.checkSumTimeouts.get(serverName).forEach((cb: (checksum: number) => void) => cb(totalCheckSum))
        this.checkSumTimeouts.delete(serverName)
      }, this.options.plugins.state.options.checkSumBuffer)
    }
  }

  /**
   * Calculates a simple checkSum for a given name. This is done up-front and cached
   * to increase performance for local add and remove operations. Arguably this is a generic
   * method and might be moved to the utils class if we find another usecase for it.
   */
  private createCheckSum (name: string) {
    let checkSum = 0
    let i

    for (i = 0; i < name.length; i++) {
      // tslint:disable-next-line:no-bitwise
      checkSum = ((checkSum << 5) - checkSum) + name.charCodeAt(i) // eslint-disable-line
    }

    return checkSum
  }

  /**
   * Checks a remote checkSum for a given serverName against the
   * actual checksum for all local entries for the given name.
   *
   * - If the checksums match, it removes all possibly pending
   *   reconciliationTimeouts
   *
   * - If the checksums don't match, it schedules a reconciliation request. If
   *   another message from the remote server arrives before the reconciliation request
   *   is send, it will be cancelled.
   */
  private verifyCheckSum (serverName: string, remoteCheckSum: number) {
    this.getCheckSumTotal(serverName, (checksum: number) => {
      if (checksum !== remoteCheckSum) {
        this.reconciliationTimeouts.set(serverName, setTimeout(
            this._requestFullState.bind(this, serverName),
            this.stateOptions.stateReconciliationTimeout
        ))
        return
      }

      const timeout = this.reconciliationTimeouts.get(serverName)
      if (timeout) {
        clearTimeout(timeout)
        this.reconciliationTimeouts.delete(timeout)
      }
    })
  }

  /**
   * Sends a reconciliation request for a server with a given name (technically, its send to
   * every node within the cluster, but will be ignored by all but the one with a matching name)
   *
   * The matching node will respond with a DISTRIBUTED_STATE_FULL_STATE message
   */
  private _requestFullState (serverName: string) {
    this.services.message.sendStateDirect(serverName, {
      topic: TOPIC.STATE_REGISTRY,
      registryTopic: this.topic,
      action: STATE_ACTIONS.REQUEST_FULL_STATE,
    })
  }

  /**
   * Creates a full state message containing an array of all local entries that
   * will be used to reconcile compromised states as well as provide the full state
   * for new nodes that joined the cluster
   *
   * When a state gets compromised, more than one remote registry might request a full state update.
   * This method will  schedule a timeout in which no additional full state messages are sent to
   * make sure only a single full state message is sent in reply.
   */
  public sendFullState (serverName: string): void {
    const localState: string[] = []

    for (const [, value] of this.data) {
      if (value.nodes.has(this.options.serverName)) {
        localState.push(name)
      }
    }
    this.services.message.sendStateDirect(serverName, {
      topic: TOPIC.STATE_REGISTRY,
      registryTopic: this.topic,
      action: STATE_ACTIONS.FULL_STATE,
      parsedData: localState
    })

    this.fullStateSent = true
    setTimeout(this.resetFullStateSent, this.stateOptions.stateReconciliationTimeout)
  }

  /**
   * This will apply the data from an incoming full state message. Entries that are not within
   * the incoming array will be removed for that node from the local registry and new entries will
   * be added.
   */
  private applyFullState (serverName: string, names: string[]) {
    const namesMap: Dictionary<boolean> = {}
    for (let i = 0; i < names.length; i++) {
      namesMap[names[i]] = true
    }

    for (const [name] of this.data) {
      // please note: only checking if the name exists is sufficient as the registry will just
      // set node[serverName] to false if the entry exists, but not for the remote server.
      if (!namesMap[name]) {
        this.removeFromServer(name, serverName)
      }
    }

    names.forEach((name) => this.addToServer(name, serverName))

    this.initialServers.delete(serverName)
    if (this.initialServers.size === 0) {
      this.isReady = true
      this.emit('ready')
    }
  }

  /**
   * Will be called after a full state message has been sent and
   * stateReconciliationTimeout has passed. This will allow further reconciliation
   * messages to be sent again.
   */
  private resetFullStateSent (): void {
    this.fullStateSent = false
  }

  /**
   * This is the main routing point for messages coming in from
   * the message connector.
   */
  private processIncomingMessage (message: StateMessage, serverName: string): void {
    if (message.action === STATE_ACTIONS.ADD) {
      this.addToServer(message.name!, serverName)
      return
    }

    if (message.action === STATE_ACTIONS.REMOVE) {
      this.removeFromServer(message.name!, serverName)
      return
    }

    if (message.action === STATE_ACTIONS.REQUEST_FULL_STATE) {
      if (!message.data || this.fullStateSent === false) {
        this.sendFullState(serverName)
      }
      return
    }

    if (message.action === STATE_ACTIONS.FULL_STATE) {
      this.applyFullState(serverName, message.fullState!)
    }

    if (message.action === STATE_ACTIONS.CHECKSUM) {
      this.verifyCheckSum(serverName, message.checksum!)
    }
  }
}
