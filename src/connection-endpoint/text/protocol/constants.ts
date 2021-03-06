import {
  AUTH_ACTION as AA,
  CONNECTION_ACTION as CA,
  EVENT_ACTION as EA,
  PARSER_ACTION as XA,
  PRESENCE_ACTION as UA,
  RECORD_ACTION as RA,
  RPC_ACTION as PA,
  TOPIC as T,
} from '../../../constants'

export const MESSAGE_SEPERATOR = String.fromCharCode(30) // ASCII Record Seperator 1E
export const MESSAGE_PART_SEPERATOR = String.fromCharCode(31) // ASCII Unit Separator 1F

export const PAYLOAD_ENCODING = {
  JSON: 0x00,
  DEEPSTREAM: 0x01,
}

export const TOPIC = {
  PARSER: { TEXT: 'X', BYTE: T.PARSER },
  CONNECTION: { TEXT: 'C', BYTE: T.CONNECTION },
  AUTH: { TEXT: 'A', BYTE: T.AUTH },
  ERROR: { TEXT: 'X', BYTE: T.ERROR },
  EVENT: { TEXT: 'E', BYTE: T.EVENT },
  RECORD: { TEXT: 'R', BYTE: T.RECORD },
  RPC: { TEXT: 'P', BYTE: T.RPC },
  PRESENCE: { TEXT: 'U', BYTE: T.PRESENCE },
}

export const PARSER_ACTIONS = {
  UNKNOWN_TOPIC: { BYTE: XA.UNKNOWN_TOPIC },
  UNKNOWN_ACTION: { BYTE: XA.UNKNOWN_ACTION },
  INVALID_MESSAGE: { BYTE: XA.INVALID_MESSAGE },
  INVALID_META_PARAMS: { BYTE: XA.INVALID_META_PARAMS },
  MESSAGE_PARSE_ERROR: { BYTE: XA.MESSAGE_PARSE_ERROR },
  MAXIMUM_MESSAGE_SIZE_EXCEEDED: { BYTE: XA.MAXIMUM_MESSAGE_SIZE_EXCEEDED },
  ERROR: { BYTE: XA.ERROR },
}

export const CONNECTION_ACTIONS = {
  ERROR: { TEXT: 'E', BYTE: CA.ERROR },
  PING: { TEXT: 'PI', BYTE: CA.PING },
  PONG: { TEXT: 'PO', BYTE: CA.PONG },
  ACCEPT: { TEXT: 'A', BYTE: CA.ACCEPT },
  CHALLENGE: { TEXT: 'CH', BYTE: CA.CHALLENGE },
  REJECTION: { TEXT: 'REJ', BYTE: CA.REJECT },
  REDIRECT: { TEXT: 'RED', BYTE: CA.REDIRECT },

  CLOSED: { BYTE: CA.CLOSED },
  CLOSING: { BYTE: CA.CLOSING },

  CONNECTION_AUTHENTICATION_TIMEOUT: { BYTE: CA.AUTHENTICATION_TIMEOUT },
  INVALID_MESSAGE: { BYTE: CA.INVALID_MESSAGE },
}

export const AUTH_ACTIONS = {
  ERROR: { TEXT: 'E', BYTE: AA.ERROR },
  REQUEST: { TEXT: 'REQ', BYTE: AA.REQUEST },
  AUTH_SUCCESSFUL: { BYTE: AA.AUTH_SUCCESSFUL, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  AUTH_UNSUCCESSFUL: { BYTE: AA.AUTH_UNSUCCESSFUL, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  TOO_MANY_AUTH_ATTEMPTS: { BYTE: AA.TOO_MANY_AUTH_ATTEMPTS },

  // MESSAGE_PERMISSION_ERROR: { BYTE: AA.MESSAGE_PERMISSION_ERROR },
  // MESSAGE_DENIED: { BYTE: AA.MESSAGE_DENIED },
  INVALID_MESSAGE_DATA: { BYTE: AA.INVALID_MESSAGE_DATA },
  INVALID_MESSAGE: { BYTE: AA.INVALID_MESSAGE },
}

export const EVENT_ACTIONS = {
  ERROR: { TEXT: 'E', BYTE: EA.ERROR },
  EMIT: { TEXT: 'EVT', BYTE: EA.EMIT, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  SUBSCRIBE: { TEXT: 'S', BYTE: EA.SUBSCRIBE },
  UNSUBSCRIBE: { TEXT: 'US', BYTE: EA.UNSUBSCRIBE },
  LISTEN: { TEXT: 'L', BYTE: EA.LISTEN },
  UNLISTEN: { TEXT: 'UL', BYTE: EA.UNLISTEN },
  LISTEN_ACCEPT: { TEXT: 'LA', BYTE: EA.LISTEN_ACCEPT },
  LISTEN_REJECT: { TEXT: 'LR', BYTE: EA.LISTEN_REJECT },
  SUBSCRIPTION_FOR_PATTERN_FOUND: { TEXT: 'SP', BYTE: EA.SUBSCRIPTION_FOR_PATTERN_FOUND },
  SUBSCRIPTION_FOR_PATTERN_REMOVED: { TEXT: 'SR', BYTE: EA.SUBSCRIPTION_FOR_PATTERN_REMOVED },

  MESSAGE_PERMISSION_ERROR: { BYTE: EA.MESSAGE_PERMISSION_ERROR },
  MESSAGE_DENIED: { BYTE: EA.MESSAGE_DENIED },
  INVALID_MESSAGE_DATA: { BYTE: EA.INVALID_MESSAGE_DATA },
  MULTIPLE_SUBSCRIPTIONS: { BYTE: EA.MULTIPLE_SUBSCRIPTIONS },
  NOT_SUBSCRIBED: { BYTE: EA.NOT_SUBSCRIBED },
}

export const RECORD_ACTIONS = {
  ERROR: { TEXT: 'E', BYTE: RA.ERROR },
  CREATE: { TEXT: 'CR', BYTE: RA.CREATE },
  READ: { TEXT: 'R', BYTE: RA.READ },
  READ_RESPONSE: { BYTE: RA.READ_RESPONSE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.JSON },
  HEAD: { TEXT: 'HD', BYTE: RA.HEAD },
  HEAD_RESPONSE: { BYTE: RA.HEAD_RESPONSE },
  CREATEANDUPDATE: { TEXT: 'CU', BYTE: RA.CREATEANDUPDATE },
  CREATEANDPATCH: { BYTE: RA.CREATEANDPATCH, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  UPDATE: { TEXT: 'U', BYTE: RA.UPDATE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.JSON },
  PATCH: { TEXT: 'P', BYTE: RA.PATCH, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  ERASE: { BYTE: RA.ERASE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  WRITE_ACKNOWLEDGEMENT: { TEXT: 'WA', BYTE: RA.WRITE_ACKNOWLEDGEMENT },
  DELETE: { TEXT: 'D', BYTE: RA.DELETE },
  DELETE_SUCCESS: { BYTE: RA.DELETE_SUCCESS },
  DELETED: { BYTE: RA.DELETED },
  LISTEN_RESPONSE_TIMEOUT: { BYTE: RA.LISTEN_RESPONSE_TIMEOUT },

  SUBSCRIBEANDHEAD: { BYTE: RA.SUBSCRIBEANDHEAD },
  // SUBSCRIBEANDHEAD_RESPONSE: { BYTE: RA.SUBSCRIBEANDHEAD_RESPONSE },
  SUBSCRIBEANDREAD: { BYTE: RA.SUBSCRIBEANDREAD },
  // SUBSCRIBEANDREAD_RESPONSE: { BYTE: RA.SUBSCRIBEANDREAD_RESPONSE },
  SUBSCRIBECREATEANDREAD: { TEXT: 'CR', BYTE: RA.SUBSCRIBECREATEANDREAD },
  // SUBSCRIBECREATEANDREAD_RESPONSE: { BYTE: RA.SUBSCRIBECREATEANDREAD_RESPONSE },
  SUBSCRIBECREATEANDUPDATE: { BYTE: RA.SUBSCRIBECREATEANDUPDATE },
  // SUBSCRIBECREATEANDUPDATE_RESPONSE: { BYTE: RA.SUBSCRIBECREATEANDUPDATE_RESPONSE },
  SUBSCRIBE: { TEXT: 'S', BYTE: RA.SUBSCRIBE },
  UNSUBSCRIBE: { TEXT: 'US', BYTE: RA.UNSUBSCRIBE },

  LISTEN: { TEXT: 'L', BYTE: RA.LISTEN },
  UNLISTEN: { TEXT: 'UL', BYTE: RA.UNLISTEN },
  LISTEN_ACCEPT: { TEXT: 'LA', BYTE: RA.LISTEN_ACCEPT },
  LISTEN_REJECT: { TEXT: 'LR', BYTE: RA.LISTEN_REJECT },
  SUBSCRIPTION_HAS_PROVIDER: { TEXT: 'SH', BYTE: RA.SUBSCRIPTION_HAS_PROVIDER },
  SUBSCRIPTION_HAS_NO_PROVIDER: { BYTE: RA.SUBSCRIPTION_HAS_NO_PROVIDER },
  SUBSCRIPTION_FOR_PATTERN_FOUND: { TEXT: 'SP', BYTE: RA.SUBSCRIPTION_FOR_PATTERN_FOUND },
  SUBSCRIPTION_FOR_PATTERN_REMOVED: { TEXT: 'SR', BYTE: RA.SUBSCRIPTION_FOR_PATTERN_REMOVED },

  CACHE_RETRIEVAL_TIMEOUT: { BYTE: RA.CACHE_RETRIEVAL_TIMEOUT },
  STORAGE_RETRIEVAL_TIMEOUT: { BYTE: RA.STORAGE_RETRIEVAL_TIMEOUT },
  VERSION_EXISTS: { BYTE: RA.VERSION_EXISTS },

  // HAS: { TEXT: 'H', BYTE: RA.HAS },
  // HAS_RESPONSE: { BYTE: RA.HAS_RESPONSE },
  SNAPSHOT: { TEXT: 'SN', BYTE: RA.READ },

  RECORD_LOAD_ERROR: { BYTE: RA.RECORD_LOAD_ERROR },
  RECORD_CREATE_ERROR: { BYTE: RA.RECORD_CREATE_ERROR },
  RECORD_UPDATE_ERROR: { BYTE: RA.RECORD_UPDATE_ERROR },
  RECORD_DELETE_ERROR: { BYTE: RA.RECORD_DELETE_ERROR },
  // RECORD_READ_ERROR: { BYTE: RA.RECORD_READ_ERROR },
  RECORD_NOT_FOUND: { BYTE: RA.RECORD_NOT_FOUND },
  INVALID_VERSION: { BYTE: RA.INVALID_VERSION },
  INVALID_PATCH_ON_HOTPATH: { BYTE: RA.INVALID_PATCH_ON_HOTPATH },

  MESSAGE_PERMISSION_ERROR: { BYTE: RA.MESSAGE_PERMISSION_ERROR },
  MESSAGE_DENIED: { BYTE: RA.MESSAGE_DENIED },
  INVALID_MESSAGE_DATA: { BYTE: RA.INVALID_MESSAGE_DATA },
  MULTIPLE_SUBSCRIPTIONS: { BYTE: RA.MULTIPLE_SUBSCRIPTIONS },
  NOT_SUBSCRIBED: { BYTE: RA.NOT_SUBSCRIBED },
}

export const RPC_ACTIONS = {
  ERROR: { BYTE: PA.ERROR },
  REQUEST: { TEXT: 'REQ', BYTE: PA.REQUEST, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  ACCEPT: { BYTE: PA.ACCEPT },
  RESPONSE: { TEXT: 'RES', BYTE: PA.RESPONSE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  REJECT: { TEXT: 'REJ', BYTE: PA.REJECT },
  REQUEST_ERROR: { TEXT: 'E', BYTE: PA.REQUEST_ERROR, PAYLOAD_ENCODING: PAYLOAD_ENCODING.DEEPSTREAM },
  PROVIDE: { TEXT: 'S', BYTE: PA.PROVIDE },
  UNPROVIDE: { TEXT: 'US', BYTE: PA.UNPROVIDE },

  NO_RPC_PROVIDER: { BYTE: PA.NO_RPC_PROVIDER },
  RESPONSE_TIMEOUT: { BYTE: PA.RESPONSE_TIMEOUT },
  ACCEPT_TIMEOUT: { BYTE: PA.ACCEPT_TIMEOUT },
  MULTIPLE_ACCEPT: { BYTE: PA.MULTIPLE_ACCEPT },
  MULTIPLE_RESPONSE: { BYTE: PA.MULTIPLE_RESPONSE },
  INVALID_RPC_CORRELATION_ID: { BYTE: PA.INVALID_RPC_CORRELATION_ID },

  MESSAGE_PERMISSION_ERROR: { BYTE: PA.MESSAGE_PERMISSION_ERROR },
  MESSAGE_DENIED: { BYTE: PA.MESSAGE_DENIED },
  INVALID_MESSAGE_DATA: { BYTE: PA.INVALID_MESSAGE_DATA },
  MULTIPLE_PROVIDERS: { BYTE: PA.MULTIPLE_PROVIDERS },
  NOT_PROVIDED: { BYTE: PA.NOT_PROVIDED },
}

export const PRESENCE_ACTIONS = {
  ERROR: { TEXT: 'E', BYTE: UA.ERROR },
  QUERY_ALL: { BYTE: UA.QUERY_ALL },
  QUERY_ALL_RESPONSE: { BYTE: UA.QUERY_ALL_RESPONSE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.JSON },
  QUERY: { TEXT: 'Q', BYTE: UA.QUERY },
  QUERY_RESPONSE: { BYTE: UA.QUERY_RESPONSE, PAYLOAD_ENCODING: PAYLOAD_ENCODING.JSON },
  PRESENCE_JOIN: { TEXT: 'PNJ', BYTE: UA.PRESENCE_JOIN },
  PRESENCE_JOIN_ALL: { TEXT: 'PNJ', BYTE: UA.PRESENCE_JOIN_ALL },
  PRESENCE_LEAVE: { TEXT: 'PNL', BYTE: UA.PRESENCE_LEAVE },
  PRESENCE_LEAVE_ALL: { TEXT: 'PNL', BYTE: UA.PRESENCE_LEAVE_ALL },
  SUBSCRIBE: { TEXT: 'S', BYTE: UA.SUBSCRIBE },
  UNSUBSCRIBE: { TEXT: 'US', BYTE: UA.UNSUBSCRIBE },

  SUBSCRIBE_ALL: { BYTE: UA.SUBSCRIBE_ALL },
  UNSUBSCRIBE_ALL: { BYTE: UA.UNSUBSCRIBE_ALL },

  INVALID_PRESENCE_USERS: { BYTE: UA.INVALID_PRESENCE_USERS },

  MESSAGE_PERMISSION_ERROR: { BYTE: UA.MESSAGE_PERMISSION_ERROR },
  MESSAGE_DENIED: { BYTE: UA.MESSAGE_DENIED },
  // INVALID_MESSAGE_DATA: { BYTE: UA.INVALID_MESSAGE_DATA },
  MULTIPLE_SUBSCRIPTIONS: { BYTE: UA.MULTIPLE_SUBSCRIPTIONS },
  NOT_SUBSCRIBED: { BYTE: UA.NOT_SUBSCRIBED },
}

export const DEEPSTREAM_TYPES = {
  STRING: 'S',
  OBJECT: 'O',
  NUMBER: 'N',
  NULL: 'L',
  TRUE: 'T',
  FALSE: 'F',
  UNDEFINED: 'U',
}

export const TOPIC_BYTE_TO_TEXT = convertMap(TOPIC, 'BYTE', 'TEXT')
export const TOPIC_TEXT_TO_BYTE = convertMap(TOPIC, 'TEXT', 'BYTE')
export const TOPIC_TEXT_TO_KEY = reverseMap(specifyMap(TOPIC, 'TEXT'))
export const TOPIC_BYTE_TO_KEY = reverseMap(specifyMap(TOPIC, 'BYTE'))
export const TOPIC_BYTES = specifyMap(TOPIC, 'BYTE')

export const ACTIONS_BYTE_TO_PAYLOAD: any = {}
export const ACTIONS_BYTE_TO_TEXT: any  = {}
export const ACTIONS_TEXT_TO_BYTE: any  = {}
export const ACTIONS_BYTES: any  = {}
export const ACTIONS_TEXT_TO_KEY: any  = {}
export const ACTIONS_BYTE_TO_KEY: any  = {}

export const ACTIONS = {
  [TOPIC.PARSER.BYTE]: PARSER_ACTIONS,
  [TOPIC.CONNECTION.BYTE]: CONNECTION_ACTIONS,
  [TOPIC.AUTH.BYTE]: AUTH_ACTIONS,
  [TOPIC.EVENT.BYTE]: EVENT_ACTIONS,
  [TOPIC.RECORD.BYTE]: RECORD_ACTIONS,
  [TOPIC.RPC.BYTE]: RPC_ACTIONS,
  [TOPIC.PRESENCE.BYTE]: PRESENCE_ACTIONS,
}

for (const key in ACTIONS) {
  ACTIONS_BYTE_TO_PAYLOAD[key] = convertMap(ACTIONS[key], 'BYTE', 'PAYLOAD_ENCODING')
  ACTIONS_BYTE_TO_TEXT[key] = convertMap(ACTIONS[key], 'BYTE', 'TEXT')
  ACTIONS_TEXT_TO_BYTE[key] = convertMap(ACTIONS[key], 'TEXT', 'BYTE')
  ACTIONS_BYTES[key] = specifyMap(ACTIONS[key], 'BYTE')
  ACTIONS_TEXT_TO_KEY[key] = reverseMap(specifyMap(ACTIONS[key], 'TEXT'))
  ACTIONS_BYTE_TO_KEY[key] = reverseMap(specifyMap(ACTIONS[key], 'BYTE'))
}

/**
 * convertMap({ a: { x: 1 }, b: { x: 2 }, c: { x : 3 } }, 'x', 'y')
 *  ===
 * { a: { y: 1 }, b: { y: 2 }, c: { y : 3 } }
 */
function convertMap (map: any, from: any, to: any) {
  const result: any = {}

  for (const key in map) {
    result[map[key][from]] = map[key][to]
  }

  return result
}

/**
 * specifyMap({ a: { x: 1 }, b: { x: 2 }, c: { x : 3 } }, 'x')
 *  ===
 * { a: 1, b: 2, c: 3 }
 */
function specifyMap (map: any, innerKey: any) {
  const result: any = {}

  for (const key in map) {
    result[key] = map[key][innerKey]
  }

  return result
}

/**
 * Takes a key-value map and returns
 * a map with { value: key } of the old map
 */
function reverseMap (map: any) {
  const reversedMap: any = {}

  for (const key in map) {
    reversedMap[map[key]] = key
  }

  return reversedMap
}
