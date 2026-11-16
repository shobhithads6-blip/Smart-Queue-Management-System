import { useState, useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import { getBoardCounters } from '../api'

function applyBoardEvent(counter, event) {
  if (counter.name !== event.counterName) return counter

  const eventTime = Date.parse(event.calledAt || '') || 0
  const counterTime = Date.parse(counter.calledAt || '') || 0
  if (eventTime < counterTime) return counter

  return {
    ...counter,
    currentToken: event.tokenNumber,
    currentService: event.serviceTypeName,
    calledAt: event.calledAt,
  }
}

export default function DisplayBoard() {
  const [counters, setCounters] = useState([])
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const clientRef = useRef(null)
  const liveEventsRef = useRef(new Map())

  useEffect(() => {
    let mounted = true

    async function loadBoardState() {
      try {
        const response = await getBoardCounters()
        if (!Array.isArray(response.data)) {
          throw new Error('The display-board response was not a list.')
        }

        if (mounted) {
          const snapshot = response.data.map(counter => {
            const liveEvent = liveEventsRef.current.get(counter.name)
            return liveEvent ? applyBoardEvent(counter, liveEvent) : counter
          })
          setCounters(snapshot)
        }
      } catch (error) {
        console.error('Failed to load display-board state', error)
        if (mounted) setCounters([])
      }
    }

    const client = new Client({
      brokerURL: `ws://${location.host}/ws`,

      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/board', (msg) => {
          let event
          try {
            event = JSON.parse(msg.body)
          } catch {
            console.warn('Received unparseable WebSocket message:', msg.body)
            return
          }

          const previousEvent = liveEventsRef.current.get(event.counterName)
          const previousTime = Date.parse(previousEvent?.calledAt || '') || 0
          const eventTime = Date.parse(event.calledAt || '') || 0
          if (eventTime >= previousTime) {
            liveEventsRef.current.set(event.counterName, event)
          }

          setCounters(previous => previous.map(counter => applyBoardEvent(counter, event)))
          setEvents(previous => [event, ...previous].slice(0, 10))
        })

        // Subscribe first, then fetch the current snapshot so calls made before
        // this page opened are shown too. Any newer live event is merged in.
        loadBoardState()
      },

      onDisconnect: () => setConnected(false),

      onStompError: (frame) => {
        console.error('STOMP broker error:', frame.headers['message'], frame.body)
      },

      reconnectDelay: 5000,
    })

    // Load the active-call snapshot even if the WebSocket is still connecting.
    loadBoardState()

    client.activate()
    clientRef.current = client
    return () => {
      mounted = false
      client.deactivate()
    }
  }, [])

  const hasActiveCalls = counters.some(counter => counter.currentToken)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Display Board</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {counters.map(counter => (
          <div
            key={counter.id}
            className="border border-gray-200 bg-white rounded-lg px-5 py-4 text-center"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{counter.name}</p>
            {counter.currentToken ? (
              <>
                <p className="text-4xl font-bold text-blue-600">{counter.currentToken}</p>
                <p className="text-xs text-gray-500 mt-1">{counter.currentService || ''}</p>
              </>
            ) : (
              <p className={`text-2xl font-light ${counter.status === 'OFFLINE' ? 'text-gray-500' : 'text-gray-300'}`}>
                {counter.status === 'OFFLINE' ? 'Closed' : '—'}
              </p>
            )}
            {counter.status === 'OFFLINE' && counter.currentToken && (
              <p className="text-xs mt-2 text-gray-500">Counter closed</p>
            )}
            {counter.status === 'PAUSED' && (
              <p className="text-xs mt-2 text-amber-500">Paused</p>
            )}
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 mb-3">Recent calls</h2>
          <div className="flex flex-col gap-2">
            {events.map((event, index) => (
              <div
                key={`${event.counterName}-${event.calledAt}-${index}`}
                className={`flex items-center justify-between border rounded px-4 py-2 text-sm ${
                  index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                }`}
              >
                <span className="font-semibold text-gray-800">{event.tokenNumber}</span>
                <span className="text-gray-500">{event.serviceTypeName}</span>
                <span className="text-gray-400">{event.counterName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && !hasActiveCalls && (
        <p className="text-sm text-gray-400 text-center mt-16">
          Waiting for tokens to be called…
        </p>
      )}
    </div>
  )
}
