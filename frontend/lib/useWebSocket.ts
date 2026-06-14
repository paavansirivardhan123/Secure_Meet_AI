import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function useWebSocket(
  topics: { topic: string; callback: (msg: any) => void }[]
) {
  const clientRef = useRef<Client | null>(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        topics.forEach(({ topic, callback }) => {
          client.subscribe(topic, (message) => {
            callback(JSON.parse(message.body))
          })
        })
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [])

  const send = useCallback((destination: string, body: any) => {
    clientRef.current?.publish({
      destination,
      body: JSON.stringify(body),
    })
  }, [])

  return { send }
}
