import { useState, useEffect } from 'react'
import {
  getAnalytics, getCounters, addCounter, setCounterStatus, deleteCounter
} from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [counters, setCounters]   = useState([])
  const [newName, setNewName]     = useState('')
  const [newStaff, setNewStaff]   = useState('')
  const [message, setMessage]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [aRes, cRes] = await Promise.all([getAnalytics(), getCounters()])
      if (!Array.isArray(cRes.data)) {
        throw new Error('The counters response was not a list.')
      }
      if (
        !aRes.data ||
        typeof aRes.data !== 'object' ||
        !aRes.data.ticketsByHour ||
        !aRes.data.ticketsByServiceType
      ) {
        throw new Error('The analytics response was incomplete.')
      }
      setAnalytics(aRes.data)
      setCounters(cRes.data)
    } catch (err) {
      console.error('Failed to load admin dashboard', err)
      setError('Unable to load dashboard data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleAddCounter(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await addCounter(newName.trim(), newStaff.trim() || null)
    setNewName(''); setNewStaff('')
    flash('Counter added.')
    loadData()
  }

  async function handleStatusChange(id, status) {
    try {
      await setCounterStatus(id, status)
      flash(status === 'OFFLINE' ? 'Counter closed; it remains visible on the Display Board.' : 'Counter status updated.')
      loadData()
    } catch (err) {
      flash(err.response?.data?.error || 'Could not update the counter status.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Close this counter? It will remain visible on the Display Board as Closed.')) return
    try {
      await deleteCounter(id)
      flash('Counter closed; it remains visible on the Display Board.')
      loadData()
    } catch (err) {
      flash(err.response?.data?.error || 'Could not close this counter.')
    }
  }

  // Build sorted arrays for recharts from the analytics maps
  const hourlyData = analytics
    ? Object.entries(analytics.ticketsByHour)
        .map(([h, count]) => ({ hour: `${h}:00`, count }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    : []

  const serviceData = analytics
    ? Object.entries(analytics.ticketsByServiceType).map(([name, count]) => ({ name, count }))
    : []

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Admin Dashboard</h1>

      {message && (
        <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
          {message}
        </div>
      )}

      {loading && (
        <p role="status" className="mb-4 text-sm text-gray-500">
          Loading dashboard data…
        </p>
      )}

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          <span>{error}</span>
          <button onClick={loadData} className="font-medium hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary stat cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total today"     value={analytics.totalTicketsToday} />
          <StatCard label="Completed"       value={analytics.totalCompleted} />
          <StatCard label="No-show"         value={analytics.totalNoShow} />
          <StatCard label="Avg wait"        value={`${Math.round(analytics.avgWaitMinutes)} min`} />
        </div>
      )}

      {/* Busiest hour bar chart */}
      {hourlyData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Tickets by Hour</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-service breakdown */}
      {serviceData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-600 mb-3">By Service Type</h2>
          <div className="flex flex-col gap-2">
            {serviceData.map(({ name, count }) => (
              <div key={name} className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-2 text-sm">
                <span className="text-gray-700">{name}</span>
                <span className="font-medium text-gray-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counter management */}
      <div>
        <h2 className="text-sm font-medium text-gray-600 mb-3">Counters</h2>

        <div className="flex flex-col gap-2 mb-4">
          {counters.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-2">
              <div>
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
                {c.staffName && <span className="text-xs text-gray-400 ml-2">— {c.staffName}</span>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={c.status}
                  onChange={e => handleStatusChange(c.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                >
                  <option>ACTIVE</option>
                  <option>PAUSED</option>
                  <option value="OFFLINE">CLOSED</option>
                </select>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={c.status === 'OFFLINE'}
                  className="text-xs text-red-400 hover:text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {c.status === 'OFFLINE' ? 'Closed' : 'Close'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add counter */}
        <form onSubmit={handleAddCounter} className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Counter name"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={newStaff}
            onChange={e => setNewStaff(e.target.value)}
            placeholder="Staff name (optional)"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm rounded px-4 py-2 hover:bg-blue-700"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
    </div>
  )
}
