import * as http from 'http'
import * as https from 'https'
import * as url from 'url'
import { EventEmitter } from 'events'
import * as HTTPStatus from 'http-status'
import * as contentType from 'content-type'
import * as bodyParser from 'body-parser'
// @ts-ignore
import * as httpShutdown from 'http-shutdown'
import { DeepstreamLogger, EVENT } from '../../../ds-types/src/index'
import { HTTPEvents } from './connection-endpoint'

function checkConfigOption (config: any, option: string, expectedType?: string): void {
  if ((expectedType && typeof config[option] !== expectedType) || config[option] === undefined) {
    throw new Error(`The HTTP plugin requires that the "${option}" config option is set`)
  }
}

export default class Server {
  private emitter = new EventEmitter()
  private isReady: boolean = false

  private origins: string = ''
  private authPathRegExp: RegExp
  private postPathRegExp: RegExp
  private getPathRegExp: RegExp
  private methods: string[] = ['GET', 'POST', 'OPTIONS']
  private methodsStr: string = this.methods.join(', ')
  private headers: string[] = ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept']
  private headersLower: string[] = this.headers.map((header) => header.toLowerCase())
  private headersStr: string = this.headers.join(', ')
  private jsonBodyParser: any

  private httpServer: any

  constructor (private config: any, private logger: DeepstreamLogger, private httpEvents: HTTPEvents) {
    checkConfigOption(config, 'port', 'number')
    checkConfigOption(config, 'host')
    checkConfigOption(config, 'enableAuthEndpoint', 'boolean')
    checkConfigOption(config, 'authPath', 'string')
    checkConfigOption(config, 'postPath', 'string')
    checkConfigOption(config, 'getPath', 'string')
    checkConfigOption(config, 'healthCheckPath', 'string')
    checkConfigOption(config, 'allowAllOrigins', 'boolean')
    checkConfigOption(config, 'maxMessageSize', 'number')

    this.jsonBodyParser = bodyParser.json({
      inflate: true,
      limit: `${config.maxMessageSize / 1024}mb`
    })

    if (config.allowAllOrigins === false) {
      checkConfigOption(config, 'origins', 'string')
      this.origins = config.origins
    }
    this.authPathRegExp = new RegExp(`^${config.authPath}/?(.*)$`, 'i')
    this.postPathRegExp = new RegExp(`^${config.postPath}/?(.*)$`, 'i')
    this.getPathRegExp = new RegExp(`^${config.getPath}/?(.*)$`, 'i')
  }

  public async whenReady () {
    if (!this.isReady) {
      return new Promise((resolve) => this.emitter.once('ready', resolve))
    }
  }

  public start (): void {
    const server = this.createHttpServer()
    this.httpServer = httpShutdown(server)
    this.httpServer.on('request', this.onRequest.bind(this))
    this.httpServer.once('listening', this.onReady.bind(this))
    this.httpServer.on('error', this.onError.bind(this))
    this.httpServer.listen(this.config.port, this.config.host)
  }

  public async stop (): Promise<void> {
    return new Promise((resolve) => this.httpServer.shutdown(resolve))
  }

  /**
   * Called when the server starts listening for requests.
   */
  private onReady (): void {
    const serverAddress = this.httpServer.address()
    const address = serverAddress.address
    const port = serverAddress.port
    this.logger.info(
      EVENT.INFO, `Listening for http connections on ${address}:${port}`
    )
    this.logger.info(
      EVENT.INFO, `Listening for health checks on path ${this.config.healthCheckPath}`
    )
    this.emitter.emit('ready')
    this.isReady = true
  }

  public static terminateResponse (response: http.ServerResponse, code: number, message?: string) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.writeHead(code)
    if (message) {
      response.end(`${message}\r\n\r\n`)
    } else {
      response.end()
    }
  }

  /**
   * Creates an HTTP or HTTPS server for ws to attach itself to,
   * depending on the options the client configured
   */
  private createHttpServer (): http.Server | https.Server {
    return http.createServer()
  }

  private onRequest (
    request: http.IncomingMessage,
    response: http.ServerResponse
   ): void {
     if (!this.config.allowAllOrigins) {
       if (!this.verifyOrigin(request, response)) {
         return
       }
     } else {
       response.setHeader('Access-Control-Allow-Origin', '*')
     }

     switch (request.method) {
       case 'POST':
         this.handlePost(request, response)
         break
       case 'GET':
         this.handleGet(request, response)
         break
       case 'OPTIONS':
         this.handleOptions(request, response)
         break
       default:
         Server.terminateResponse(
           response,
           HTTPStatus.METHOD_NOT_ALLOWED,
           `Unsupported method. Supported methods: ${this.methodsStr}`
         )
     }
   }

  private verifyOrigin (
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): boolean {
    const requestOriginUrl = request.headers.origin as string || request.headers.referer as string
    const requestHostUrl = request.headers.host
    if (this.config.hostUrl && requestHostUrl !== this.config.hostUrl) {
      Server.terminateResponse(response, HTTPStatus.FORBIDDEN, 'Forbidden Host.')
      return false
    }
    if (this.origins.indexOf(requestOriginUrl) === -1) {
      if (!requestOriginUrl) {
        Server.terminateResponse(
          response,
          HTTPStatus.FORBIDDEN,
          'CORS is configured for this server. All requests must set a valid "Origin" header.'
        )
      } else {
        Server.terminateResponse(
          response,
          HTTPStatus.FORBIDDEN,
          `Origin "${requestOriginUrl}" is forbidden.`
        )
      }
      return false
    }

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    response.setHeader('Access-Control-Allow-Origin', requestOriginUrl)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Vary', 'Origin')

    return true
  }

  private handlePost (request: any, response: any): void {
    let parsedContentType
    try {
      parsedContentType = contentType.parse(request)
    } catch (typeError) {
      parsedContentType = { type: null }
    }
    if (parsedContentType.type !== 'application/json') {
      Server.terminateResponse(
        response,
        HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
        'Invalid "Content-Type" header. Supported media types: "application/json"'
      )
      return
    }

    this.jsonBodyParser(request, response, (err: Error | null) => {
      if (err) {
        Server.terminateResponse(
          response,
          HTTPStatus.BAD_REQUEST,
          `Failed to parse body of request: ${err.message}`
        )
        return
      }
      const onResponse = Server.onHandlerResponse.bind(null, response)
      const metadata = { headers: request.headers, url: request.url }

      if (this.config.enableAuthEndpoint && this.authPathRegExp.test(request.url)) {
        this.httpEvents.onAuthMessage(request.body, metadata, onResponse)

      } else if (this.postPathRegExp.test(request.url)) {
        this.httpEvents.onPostMessage(request.body, metadata, onResponse)

      } else {
        Server.terminateResponse(response, HTTPStatus.NOT_FOUND, 'Endpoint not found.')
      }
    })
  }

  private handleGet (
    request: http.IncomingMessage,
    response: http.ServerResponse
   ): void {
    const parsedUrl = url.parse(request.url as string, true)
    const onResponse = Server.onHandlerResponse.bind(null, response)

    if (parsedUrl.pathname === this.config.healthCheckPath) {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.writeHead(HTTPStatus.OK)
      response.end('OK\r\n\r\n')

    } else if (this.getPathRegExp.test(parsedUrl.pathname as string)) {
      this.httpEvents.onGetMessage(parsedUrl.query, request.headers, onResponse)

    } else {
      Server.terminateResponse(response, HTTPStatus.NOT_FOUND, 'Endpoint not found.')
    }
  }

  private handleOptions (
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): void {
    const requestMethod = request.headers['access-control-request-method'] as string | undefined
    if (!requestMethod) {
      Server.terminateResponse(
        response,
        HTTPStatus.BAD_REQUEST,
        'Missing header "Access-Control-Request-Method".'
      )
      return
    }
    if (this.methods.indexOf(requestMethod) === -1) {
      Server.terminateResponse(
        response,
        HTTPStatus.FORBIDDEN,
        `Method ${requestMethod} is forbidden. Supported methods: ${this.methodsStr}`
      )
      return
    }

    const requestHeadersRaw = request.headers['access-control-request-headers'] as string | undefined
    if (!requestHeadersRaw) {
      Server.terminateResponse(
        response,
        HTTPStatus.BAD_REQUEST,
        'Missing header "Access-Control-Request-Headers".'
      )
      return
    }
    const requestHeaders = requestHeadersRaw.split(',')
    for (let i = 0; i < requestHeaders.length; i++) {
      if (this.headersLower.indexOf(requestHeaders[i].trim().toLowerCase()) === -1) {
        Server.terminateResponse(
          response,
          HTTPStatus.FORBIDDEN,
          `Header ${requestHeaders[i]} is forbidden. Supported headers: ${this.headersStr}`
        )
        return
      }
    }

    response.setHeader('Access-Control-Allow-Methods', this.methodsStr)
    response.setHeader('Access-Control-Allow-Headers', this.headersStr)
    Server.terminateResponse(response, HTTPStatus.NO_CONTENT)
  }

  private static onHandlerResponse (
    response: http.ServerResponse,
    err: { statusCode: number, message: string },
    data: { result: string, body: object }
  ): void {
    if (err) {
      const statusCode = err.statusCode || HTTPStatus.BAD_REQUEST
      Server.terminateResponse(response, statusCode, err.message)
      return
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.writeHead(HTTPStatus.OK)
    response.end(`${JSON.stringify(data)}\r\n\r\n`)
  }

  /**
   * Generic callback for connection errors. This will most often be called
   * if the configured port number isn't available
   */
  private onError (error: string): void {
    this.logger.fatal(EVENT.CONNECTION_ERROR, error.toString())
  }
}
