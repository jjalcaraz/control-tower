// SMS Provider Integration Service
// Supports Twilio and Bandwidth APIs for SMS sending and receiving

export interface SMSMessage {
  id: string
  to: string
  from: string
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  error?: string
  timestamp: string
  provider: 'twilio' | 'bandwidth'
  segments: number
  cost?: number
}

export interface SMSWebhook {
  messageId: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  to: string
  from: string
  body?: string
  timestamp: string
  error?: string
  provider: 'twilio' | 'bandwidth'
}

export interface PhoneNumber {
  id: string
  phoneNumber: string
  friendlyName: string
  capabilities: {
    sms: boolean
    mms: boolean
    voice: boolean
  }
  status: 'active' | 'suspended' | 'disabled'
  provider: 'twilio' | 'bandwidth'
  monthlyRentCost: number
  createdAt: string
}

export interface SMSProvider {
  name: 'twilio' | 'bandwidth'
  sendMessage(message: SendMessageRequest): Promise<SMSMessage>
  getMessageStatus(messageId: string): Promise<SMSMessage>
  getPhoneNumbers(): Promise<PhoneNumber[]>
  purchasePhoneNumber(areaCode: string): Promise<PhoneNumber>
  releasePhoneNumber(phoneNumber: string): Promise<boolean>
  validateWebhook(payload: any, signature: string): boolean
  parseWebhook(payload: any): SMSWebhook
}

export interface SendMessageRequest {
  to: string
  from: string
  body: string
  mediaUrls?: string[]
}

// Twilio Provider Implementation
export class TwilioProvider implements SMSProvider {
  name: 'twilio' = 'twilio'
  private accountSid: string
  private authToken: string
  private baseUrl = 'https://api.twilio.com/2010-04-01'

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid
    this.authToken = authToken
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const auth = btoa(`${this.accountSid}:${this.authToken}`)
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body ? new URLSearchParams(body).toString() : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Twilio API Error: ${error.message}`)
    }

    return response.json()
  }

  async sendMessage(message: SendMessageRequest): Promise<SMSMessage> {
    const body: any = {
      To: message.to,
      From: message.from,
      Body: message.body
    }

    if (message.mediaUrls && message.mediaUrls.length > 0) {
      message.mediaUrls.forEach((url, index) => {
        body[`MediaUrl${index}`] = url
      })
    }

    const response = await this.makeRequest(
      `/Accounts/${this.accountSid}/Messages.json`, 
      'POST', 
      body
    )

    return {
      id: response.sid,
      to: response.to,
      from: response.from,
      body: response.body,
      status: this.mapTwilioStatus(response.status),
      timestamp: response.date_created,
      provider: 'twilio',
      segments: parseInt(response.num_segments) || 1,
      cost: parseFloat(response.price) || 0
    }
  }

  async getMessageStatus(messageId: string): Promise<SMSMessage> {
    const response = await this.makeRequest(
      `/Accounts/${this.accountSid}/Messages/${messageId}.json`,
      'GET'
    )

    return {
      id: response.sid,
      to: response.to,
      from: response.from,
      body: response.body,
      status: this.mapTwilioStatus(response.status),
      timestamp: response.date_updated,
      provider: 'twilio',
      segments: parseInt(response.num_segments) || 1,
      cost: parseFloat(response.price) || 0,
      error: response.error_message
    }
  }

  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const response = await this.makeRequest(
      `/Accounts/${this.accountSid}/IncomingPhoneNumbers.json`,
      'GET'
    )

    return response.incoming_phone_numbers.map((phone: any) => ({
      id: phone.sid,
      phoneNumber: phone.phone_number,
      friendlyName: phone.friendly_name,
      capabilities: {
        sms: phone.capabilities.sms,
        mms: phone.capabilities.mms,
        voice: phone.capabilities.voice
      },
      status: 'active', // Twilio doesn't have status field like this
      provider: 'twilio',
      monthlyRentCost: 1.00, // Twilio's standard rate
      createdAt: phone.date_created
    }))
  }

  async purchasePhoneNumber(areaCode: string): Promise<PhoneNumber> {
    // First, search for available numbers
    const availableNumbers = await this.makeRequest(
      `/Accounts/${this.accountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&SmsEnabled=true&Limit=1`,
      'GET'
    )

    if (!availableNumbers.available_phone_numbers.length) {
      throw new Error(`No SMS-enabled numbers available in area code ${areaCode}`)
    }

    const selectedNumber = availableNumbers.available_phone_numbers[0]

    // Purchase the number
    const purchaseResponse = await this.makeRequest(
      `/Accounts/${this.accountSid}/IncomingPhoneNumbers.json`,
      'POST',
      {
        PhoneNumber: selectedNumber.phone_number,
        SmsUrl: process.env.REACT_APP_SMS_WEBHOOK_URL,
        SmsMethod: 'POST'
      }
    )

    return {
      id: purchaseResponse.sid,
      phoneNumber: purchaseResponse.phone_number,
      friendlyName: purchaseResponse.friendly_name,
      capabilities: {
        sms: purchaseResponse.capabilities.sms,
        mms: purchaseResponse.capabilities.mms,
        voice: purchaseResponse.capabilities.voice
      },
      status: 'active',
      provider: 'twilio',
      monthlyRentCost: 1.00,
      createdAt: purchaseResponse.date_created
    }
  }

  async releasePhoneNumber(phoneNumber: string): Promise<boolean> {
    // First find the phone number SID
    const phoneNumbers = await this.getPhoneNumbers()
    const targetPhone = phoneNumbers.find(p => p.phoneNumber === phoneNumber)
    
    if (!targetPhone) {
      throw new Error(`Phone number ${phoneNumber} not found`)
    }

    await this.makeRequest(
      `/Accounts/${this.accountSid}/IncomingPhoneNumbers/${targetPhone.id}.json`,
      'DELETE'
    )

    return true
  }

  validateWebhook(payload: any, signature: string): boolean {
    // In a real implementation, you would validate the signature using Twilio's crypto
    // This is a simplified version
    const crypto = require('crypto')
    const authToken = this.authToken
    const url = process.env.REACT_APP_SMS_WEBHOOK_URL || ''
    
    const hmac = crypto.createHmac('sha1', authToken)
    const body = new URLSearchParams(payload).toString()
    hmac.update(url + body)
    const expectedSignature = hmac.digest('base64')
    
    return expectedSignature === signature
  }

  parseWebhook(payload: any): SMSWebhook {
    return {
      messageId: payload.MessageSid,
      status: this.mapTwilioStatus(payload.MessageStatus),
      to: payload.To,
      from: payload.From,
      body: payload.Body,
      timestamp: new Date().toISOString(),
      provider: 'twilio'
    }
  }

  private mapTwilioStatus(twilioStatus: string): SMSMessage['status'] {
    switch (twilioStatus) {
      case 'queued':
      case 'accepted':
        return 'queued'
      case 'sent':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'failed':
      case 'undelivered':
        return 'failed'
      case 'received':
        return 'received'
      default:
        return 'queued'
    }
  }
}

// Bandwidth Provider Implementation
export class BandwidthProvider implements SMSProvider {
  name: 'bandwidth' = 'bandwidth'
  private accountId: string
  private username: string
  private password: string
  private baseUrl = 'https://messaging.bandwidth.com/api/v2'

  constructor(accountId: string, username: string, password: string) {
    this.accountId = accountId
    this.username = username
    this.password = password
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const auth = btoa(`${this.username}:${this.password}`)
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Bandwidth API Error: ${error.description || response.statusText}`)
    }

    return response.json()
  }

  async sendMessage(message: SendMessageRequest): Promise<SMSMessage> {
    const body = {
      to: [message.to],
      from: message.from,
      text: message.body,
      media: message.mediaUrls || []
    }

    const response = await this.makeRequest(
      `/users/${this.accountId}/messages`,
      'POST',
      body
    )

    return {
      id: response.id,
      to: message.to,
      from: message.from,
      body: message.body,
      status: 'sent', // Bandwidth immediately returns sent status
      timestamp: new Date().toISOString(),
      provider: 'bandwidth',
      segments: this.calculateSegments(message.body),
      cost: this.calculateCost(message.body, message.mediaUrls)
    }
  }

  async getMessageStatus(messageId: string): Promise<SMSMessage> {
    // Bandwidth doesn't provide a direct message status endpoint
    // Status updates come through webhooks
    throw new Error('Bandwidth message status must be tracked through webhooks')
  }

  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const response = await this.makeRequest(
      `/users/${this.accountId}/phoneNumbers`,
      'GET'
    )

    return response.map((phone: any) => ({
      id: phone.phoneNumber,
      phoneNumber: phone.phoneNumber,
      friendlyName: phone.name || phone.phoneNumber,
      capabilities: {
        sms: true,
        mms: true,
        voice: phone.voice || false
      },
      status: 'active',
      provider: 'bandwidth',
      monthlyRentCost: 0.50, // Bandwidth's standard rate
      createdAt: new Date().toISOString()
    }))
  }

  async purchasePhoneNumber(areaCode: string): Promise<PhoneNumber> {
    // Search for available numbers
    const searchResponse = await this.makeRequest(
      `/availableNumbers?areaCode=${areaCode}&quantity=1&sms=true`,
      'GET'
    )

    if (!searchResponse.telephoneNumbers.length) {
      throw new Error(`No SMS-enabled numbers available in area code ${areaCode}`)
    }

    const selectedNumber = searchResponse.telephoneNumbers[0]

    // Order the number
    const orderResponse = await this.makeRequest(
      `/users/${this.accountId}/phoneNumbers`,
      'POST',
      {
        phoneNumber: selectedNumber.fullNumber
      }
    )

    return {
      id: selectedNumber.fullNumber,
      phoneNumber: selectedNumber.fullNumber,
      friendlyName: selectedNumber.fullNumber,
      capabilities: {
        sms: true,
        mms: true,
        voice: false
      },
      status: 'active',
      provider: 'bandwidth',
      monthlyRentCost: 0.50,
      createdAt: new Date().toISOString()
    }
  }

  async releasePhoneNumber(phoneNumber: string): Promise<boolean> {
    await this.makeRequest(
      `/users/${this.accountId}/phoneNumbers/${encodeURIComponent(phoneNumber)}`,
      'DELETE'
    )
    return true
  }

  validateWebhook(payload: any, signature: string): boolean {
    // Bandwidth webhook validation would go here
    // This is a simplified version
    return true
  }

  parseWebhook(payload: any): SMSWebhook {
    const message = payload[0] // Bandwidth sends arrays
    return {
      messageId: message.messageId,
      status: this.mapBandwidthStatus(message.type),
      to: message.to,
      from: message.from,
      body: message.text,
      timestamp: message.time,
      provider: 'bandwidth'
    }
  }

  private mapBandwidthStatus(bandwidthType: string): SMSMessage['status'] {
    switch (bandwidthType) {
      case 'message-sending':
        return 'sent'
      case 'message-delivered':
        return 'delivered'
      case 'message-failed':
        return 'failed'
      case 'message-received':
        return 'received'
      default:
        return 'queued'
    }
  }

  private calculateSegments(body: string): number {
    return Math.ceil(body.length / 160)
  }

  private calculateCost(body: string, mediaUrls?: string[]): number {
    const segments = this.calculateSegments(body)
    const smsCost = segments * 0.0075 // Bandwidth SMS rate
    const mmsCost = mediaUrls && mediaUrls.length > 0 ? 0.02 : 0 // MMS rate
    return smsCost + mmsCost
  }
}

// SMS Service Manager
export class SMSService {
  private providers: Map<string, SMSProvider> = new Map()
  private defaultProvider: 'twilio' | 'bandwidth' = 'twilio'

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize Twilio if credentials are available
    const twilioSid = process.env.REACT_APP_TWILIO_ACCOUNT_SID
    const twilioToken = process.env.REACT_APP_TWILIO_AUTH_TOKEN
    
    if (twilioSid && twilioToken) {
      this.providers.set('twilio', new TwilioProvider(twilioSid, twilioToken))
    }

    // Initialize Bandwidth if credentials are available
    const bandwidthAccountId = process.env.REACT_APP_BANDWIDTH_ACCOUNT_ID
    const bandwidthUsername = process.env.REACT_APP_BANDWIDTH_USERNAME
    const bandwidthPassword = process.env.REACT_APP_BANDWIDTH_PASSWORD

    if (bandwidthAccountId && bandwidthUsername && bandwidthPassword) {
      this.providers.set('bandwidth', new BandwidthProvider(
        bandwidthAccountId, 
        bandwidthUsername, 
        bandwidthPassword
      ))
    }

    // Set default provider to the first available one
    if (this.providers.has('twilio')) {
      this.defaultProvider = 'twilio'
    } else if (this.providers.has('bandwidth')) {
      this.defaultProvider = 'bandwidth'
    }
  }

  getProvider(providerName?: 'twilio' | 'bandwidth'): SMSProvider {
    const provider = this.providers.get(providerName || this.defaultProvider)
    if (!provider) {
      throw new Error(`SMS provider ${providerName || this.defaultProvider} not configured`)
    }
    return provider
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async sendMessage(
    message: SendMessageRequest, 
    providerName?: 'twilio' | 'bandwidth'
  ): Promise<SMSMessage> {
    const provider = this.getProvider(providerName)
    return provider.sendMessage(message)
  }

  async sendBulkMessages(
    messages: SendMessageRequest[],
    providerName?: 'twilio' | 'bandwidth',
    rateLimitPerMinute: number = 60
  ): Promise<SMSMessage[]> {
    const provider = this.getProvider(providerName)
    const results: SMSMessage[] = []
    const delayMs = (60 * 1000) / rateLimitPerMinute // Convert to milliseconds between sends

    for (const message of messages) {
      try {
        const result = await provider.sendMessage(message)
        results.push(result)
        
        // Rate limiting delay
        if (messages.indexOf(message) < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      } catch (error) {
        console.error('Error sending message:', error)
        results.push({
          id: `error-${Date.now()}`,
          to: message.to,
          from: message.from,
          body: message.body,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          provider: providerName || this.defaultProvider,
          segments: 1
        })
      }
    }

    return results
  }

  async getAllPhoneNumbers(): Promise<PhoneNumber[]> {
    const allNumbers: PhoneNumber[] = []
    
    for (const [providerName, provider] of this.providers) {
      try {
        const numbers = await provider.getPhoneNumbers()
        allNumbers.push(...numbers)
      } catch (error) {
        console.error(`Error fetching phone numbers from ${providerName}:`, error)
      }
    }

    return allNumbers
  }

  handleWebhook(payload: any, signature: string, providerName: 'twilio' | 'bandwidth'): SMSWebhook | null {
    try {
      const provider = this.getProvider(providerName)
      
      if (!provider.validateWebhook(payload, signature)) {
        console.error('Invalid webhook signature')
        return null
      }

      return provider.parseWebhook(payload)
    } catch (error) {
      console.error('Error processing webhook:', error)
      return null
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()