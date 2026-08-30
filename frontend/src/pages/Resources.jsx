import React, { useEffect, useRef, useState, useCallback } from 'react'
import api from '../lib/api'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import {
  Zap, Droplets, Trash2, Building2, Search, Plus,
  UploadCloud, Pencil, X, FileSpreadsheet, ChevronLeft, ChevronRight, Activity,
  AlertTriangle, RefreshCw
} from '../components/Icons'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['Block A', 'Block B', 'Block C']

const TYPES = [
  { value: 'electricity', label: 'ELECTRICITY', Icon: Zap,      unit: 'KWH', color: 'var(--color-electricity)' },
  { value: 'water',       label: 'WATER',       Icon: Droplets, unit: 'L',   color: 'var(--color-water)' },
  { value: 'waste',       label: 'WASTE',       Icon: Trash2,   unit: 'KG',  color: 'var(--color-waste)' },
]

const TODAY = new Date().toISOString().slice(0, 10)
const PAGE_SIZE = 20

function parseDate(record) {
  if (record.notes) {
    const match = record.notes.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return record.created_at ? record.created_at.slice(0, 10) : '';
}

function parseNoteText(record) {
  if (!record.notes) return '—'
  const cleaned = record.notes.replace(/^\d{4}-\d{2}-\d{2}(\s*—\s*)?/, '').trim()
  return cleaned || '—'
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const [y, m, d] = dateStr.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function fmt(n, dec = 1) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: dec })
}

// ── Records Page Component ────────────────────────────────────────────────────
export default function Records() {
  const { isAdmin, department: userDept } = useAuth()
  const lockedDept = isAdmin ? null : (userDept || DEPARTMENTS[0])

  // State
  const [records,       setRecords]       = useState([])
  const [totalCount,    setTotalCount]    = useState(0)
  const [totalPages,    setTotalPages]    = useState(1)
  const [page,          setPage]          = useState(1)
  const [loading,       setLoading]       = useState(true)
  const [fetchError,    setFetchError]    = useState('')
  const [toast,         setToast]         = useState(null)

  // Filters
  const [search,        setSearch]        = useState('')
  const [category,      setCategory]      = useState('all')
  const [department,    setDepartment]    = useState(lockedDept || 'all')
  const [startDate,     setStartDate]     = useState('')
  const [endDate,       setEndDate]       = useState('')

  // Modals
  const [showAddEdit,   setShowAddEdit]   = useState(false)
  const [editRecord,    setEditRecord]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [showCsvModal,  setShowCsvModal]  = useState(false)

  function showToast(type, message) {
    setToast({ type, message })
  }

  const fetchRecords = useCallback(async (targetPage = page) => {
    setLoading(true)
    setFetchError('')
    try {
      const params = { page: targetPage, limit: PAGE_SIZE }
      if (search.trim()) params.search = search.trim()
      if (category !== 'all') params.category = category
      if (isAdmin && department !== 'all') params.department = department
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const { data } = await api.get('/api/records', { params })
      let recs = data.records || []

      if (startDate || endDate) {
        recs = recs.filter((r) => {
          const d = parseDate(r)
          if (!d) return true
          if (startDate && d < startDate) return false
          if (endDate && d > endDate) return false
          return true
        })
      }

      setRecords(recs)
      setTotalCount(data.count ?? recs.length)
      setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.count ?? recs.length) / PAGE_SIZE)))
      setPage(targetPage)
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not retrieve meter telemetry records from database.'
      setFetchError(msg)
      showToast('error', msg)
    } finally {
      setLoading(false)
    }
  }, [page, search, category, department, startDate, endDate, isAdmin])

  useEffect(() => {
    fetchRecords(1)
  }, [category, department, startDate, endDate])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRecords(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function handleResetFilters() {
    setSearch('')
    setCategory('all')
    setDepartment(lockedDept || 'all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = search || category !== 'all' || (isAdmin && department !== 'all') || startDate || endDate

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/records/${deleteTarget.id}`)
      showToast('success', 'Record deleted successfully')
      setDeleteTarget(null)
      fetchRecords(page)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete record')
    }
  }

  return (
    <div className="fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Usage Records Log</h1>
          <p className="page-subtitle">
            Search, filter, update, or import multi-building meter telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCsvModal(true)}
          >
            <UploadCloud size={14} /> BULK CSV IMPORT
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setEditRecord(null); setShowAddEdit(true) }}
          >
            <Plus size={14} strokeWidth={2.5} /> LOG RECORD
          </button>
        </div>
      </div>

      {/* ── Search & Filters Bar ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 18, padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, alignItems: 'center' }}>
          {/* Keyword Search */}
          <div>
            <label style={filterLabel}>Search Notes / Block</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by keyword…"
                style={{ paddingLeft: 30, fontSize: 12.5 }}
              />
              <div style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }}>
                <Search size={13} />
              </div>
            </div>
          </div>

          {/* Resource Type */}
          <div>
            <label style={filterLabel}>Resource Type</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ fontSize: 12.5, cursor: 'pointer' }}
            >
              <option value="all">All Resources</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Block / Location */}
          <div>
            <label style={filterLabel}>Block / Location</label>
            {isAdmin ? (
              <select
                className="input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ fontSize: 12.5, cursor: 'pointer' }}
              >
                <option value="all">All Blocks</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <div className="input" style={{ fontSize: 12.5, background: 'var(--color-surface-recessed)', color: 'var(--color-text)', fontWeight: 600, cursor: 'default', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Building2 size={13} color="var(--color-text-muted)" />
                {lockedDept}
              </div>
            )}
          </div>

          {/* From Date */}
          <div>
            <label style={filterLabel}>From Date</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: 12.5, cursor: 'pointer' }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={filterLabel}>To Date</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ fontSize: 12.5, cursor: 'pointer' }}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-card-border-subtle)', fontSize: 11.5 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Filtering active</span>
            <button
              onClick={handleResetFilters}
              style={{ background: 'none', border: 'none', color: 'var(--color-electricity)', cursor: 'pointer', fontWeight: 600, fontSize: 11.5 }}
            >
              Clear filters ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Records Table ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--color-card-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>
              Meter Records
            </span>
            <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
              {totalCount} total entries
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Page {page} / {totalPages}
          </span>
        </div>

        {/* Error state */}
        {fetchError && !loading && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(194, 84, 71, 0.10)',
            borderBottom: '1px solid rgba(194, 84, 71, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--color-accent-alert)" />
              <span style={{ fontSize: 12.5, color: 'var(--color-accent-alert)' }}>{fetchError}</span>
            </div>
            <button className="btn btn-secondary" onClick={() => fetchRecords(page)} style={{ fontSize: 10.5, padding: '4px 12px' }}>
              <RefreshCw size={11} /> RETRY LOG FETCH
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <>
            {/* Desktop Table Skeleton */}
            <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-recessed)', borderBottom: '1px solid var(--color-card-border)' }}>
                    <th style={th}>DATE</th>
                    <th style={th}>RESOURCE TYPE</th>
                    <th style={th}>CONSUMPTION</th>
                    <th style={th}>BLOCK / LOCATION</th>
                    <th style={th}>OPERATIONAL NOTES</th>
                    <th style={{ ...th, textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-card-border-subtle)' }}>
                      <td style={td}><div className="skeleton" style={{ height: 13, width: 75 }} /></td>
                      <td style={td}><div className="skeleton" style={{ height: 20, width: 95, borderRadius: 9999 }} /></td>
                      <td style={td}><div className="skeleton" style={{ height: 14, width: 60 }} /></td>
                      <td style={td}><div className="skeleton" style={{ height: 13, width: 55 }} /></td>
                      <td style={td}><div className="skeleton" style={{ height: 13, width: 140 }} /></td>
                      <td style={{ ...td, textAlign: 'right' }}><div className="skeleton" style={{ height: 20, width: 45, marginLeft: 'auto', borderRadius: 4 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Skeleton */}
            <div className="mobile-card-list">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ height: 18, width: 90, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 14, width: 70 }} />
                  </div>
                  <div className="skeleton" style={{ height: 26, width: 120 }} />
                  <div className="skeleton" style={{ height: 14, width: '100%' }} />
                </div>
              ))}
            </div>
          </>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px' }}>
            {hasActiveFilters ? (
              <Search size={32} color="var(--color-text-dim)" style={{ margin: '0 auto 10px' }} />
            ) : (
              <FileSpreadsheet size={32} color="var(--color-text-dim)" style={{ margin: '0 auto 10px' }} />
            )}
            <div className="font-pachama-display" style={{ fontSize: 14.5, color: 'var(--color-text)', marginBottom: 4 }}>
              {hasActiveFilters ? 'NO MATCHING TELEMETRY RECORDS' : 'NO READINGS LOGGED YET'}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.5 }}>
              {hasActiveFilters
                ? 'No telemetry records match your current filter parameters. Try clearing or expanding your date and type filters.'
                : 'Start tracking facility utility consumption by logging your first meter measurement or uploading a bulk telemetry CSV file.'}
            </p>
            {hasActiveFilters ? (
              <button className="btn btn-secondary" onClick={handleResetFilters} style={{ fontSize: 11 }}>
                RESET SEARCH FILTERS
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setShowAddEdit(true)} style={{ fontSize: 11 }}>
                  <Plus size={12} strokeWidth={2} /> LOG FIRST RECORD
                </button>
                <button className="btn btn-secondary" onClick={() => setShowBulkUpload(true)} style={{ fontSize: 11 }}>
                  <UploadCloud size={12} strokeWidth={2} /> BULK CSV IMPORT
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (>= 768px) */}
            <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-recessed)', borderBottom: '1px solid var(--color-card-border)' }}>
                    <th style={th}>DATE</th>
                    <th style={th}>RESOURCE TYPE</th>
                    <th style={th}>CONSUMPTION</th>
                    <th style={th}>BLOCK / LOCATION</th>
                    <th style={th}>OPERATIONAL NOTES</th>
                    <th style={{ ...th, textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const typeMeta = TYPES.find((t) => t.value === r.category?.toLowerCase()) || {
                      label: r.category, color: '#64748B', unit: r.unit || '', Icon: Activity,
                    }
                    const TypeIcon = typeMeta.Icon
                    const dateStr = parseDate(r)
                    const notesText = parseNoteText(r)

                    return (
                      <tr
                        key={r.id || i}
                        style={{
                          borderBottom: i < records.length - 1 ? '1px solid var(--color-card-border-subtle)' : 'none',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-recessed)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Date */}
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                            {fmtDate(dateStr)}
                          </span>
                        </td>

                        {/* Resource Type */}
                        <td style={td}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px', borderRadius: 4,
                            fontSize: 11.5, fontWeight: 600,
                            background: `${typeMeta.color}15`,
                            color: typeMeta.color,
                          }}>
                            <TypeIcon size={12} strokeWidth={2} />
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td style={td}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                            {fmt(r.quantity)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                            {r.unit || typeMeta.unit}
                          </span>
                        </td>

                        {/* Block */}
                        <td style={td}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {r.resource_name}
                          </span>
                        </td>

                        {/* Notes */}
                        <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }} title={notesText}>
                          {notesText}
                        </td>

                        {/* Actions */}
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <button
                              onClick={() => { setEditRecord(r); setShowAddEdit(true) }}
                              title="Edit Record"
                              style={actionBtnStyle}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.06)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <Pencil size={12} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(r)}
                              title="Delete Record"
                              style={{ ...actionBtnStyle, color: 'var(--color-accent-alert)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(194, 84, 71, 0.12)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px) */}
            <div className="mobile-card-list">
              {records.map((r, i) => {
                const typeMeta = TYPES.find((t) => t.value === r.category?.toLowerCase()) || {
                  label: r.category, color: '#64748B', unit: r.unit || '', Icon: Activity,
                }
                const TypeIcon = typeMeta.Icon
                const dateStr = parseDate(r)
                const notesText = parseNoteText(r)

                return (
                  <div
                    key={r.id || i}
                    className="card"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      background: 'var(--color-surface)',
                      borderLeft: `3.5px solid ${typeMeta.color}`,
                    }}
                  >
                    {/* Top Row: Resource + Date */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 4,
                        fontSize: 10.5, fontWeight: 700,
                        background: `${typeMeta.color}18`,
                        color: typeMeta.color,
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.06em',
                      }}>
                        <TypeIcon size={12} strokeWidth={2} />
                        {typeMeta.label}
                      </span>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {fmtDate(dateStr)}
                      </span>
                    </div>

                    {/* Middle Row: Quantity + Building */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div>
                        <span className="font-pachama-hero-number" style={{ fontSize: 24, color: 'var(--color-text)' }}>
                          {fmt(r.quantity)}
                        </span>
                        <span className="font-unit" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                          {r.unit || typeMeta.unit}
                        </span>
                      </div>

                      <span className="font-eyebrow" style={{
                        fontSize: 10.5,
                        padding: '3px 8px',
                        background: 'var(--color-surface-recessed)',
                        border: '1px solid var(--color-card-border)',
                        borderRadius: 4,
                        color: 'var(--color-text)',
                      }}>
                        {r.resource_name}
                      </span>
                    </div>

                    {/* Operational Notes if present */}
                    {notesText && notesText !== '—' && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4, background: 'var(--color-surface-recessed)', padding: '6px 10px', borderRadius: 4 }}>
                        {notesText}
                      </div>
                    )}

                    {/* Action Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 8,
                      paddingTop: 8,
                      borderTop: '1px solid var(--color-card-border-subtle)',
                    }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setEditRecord(r); setShowAddEdit(true) }}
                        style={{ fontSize: 10, padding: '5px 12px' }}
                      >
                        <Pencil size={11} strokeWidth={2} /> EDIT
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setDeleteTarget(r)}
                        style={{ fontSize: 10, padding: '5px 12px', color: 'var(--color-accent-alert)', borderColor: 'rgba(194, 84, 71, 0.35)' }}
                      >
                        <Trash2 size={11} strokeWidth={2} /> DELETE
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Pagination Footer ──────────────────────────────────────────────── */}
        {!loading && totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 18px', borderTop: '1px solid var(--color-card-border)', background: 'var(--color-surface)', fontSize: 12 }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 11.5 }}>
              Showing <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{(page - 1) * PAGE_SIZE + 1}</span>–<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>{totalCount}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => fetchRecords(page - 1)}
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                <ChevronLeft size={12} /> PREV
              </button>

              <span className="font-data-mono" style={{ fontSize: 11, padding: '0 6px', color: 'var(--color-text-muted)' }}>
                {page} / {totalPages}
              </span>

              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => fetchRecords(page + 1)}
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                NEXT <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      {showAddEdit && (
        <AddEditModal
          record={editRecord}
          isAdmin={isAdmin}
          userDept={userDept}
          onClose={() => { setShowAddEdit(false); setEditRecord(null) }}
          onSuccess={(msg) => {
            setShowAddEdit(false)
            setEditRecord(null)
            showToast('success', msg)
            fetchRecords(editRecord ? page : 1)
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Bulk CSV Import Modal ──────────────────────────────────────────── */}
      {showCsvModal && (
        <CsvModal
          onClose={() => setShowCsvModal(false)}
          onSuccess={(inserted) => {
            setShowCsvModal(false)
            showToast('success', `${inserted} records imported successfully!`)
            fetchRecords(1)
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AddEditModal({ record, isAdmin, userDept, onClose, onSuccess }) {
  const isEditing = Boolean(record)
  const defaultDept = isEditing ? record.resource_name : (isAdmin ? DEPARTMENTS[0] : (userDept || DEPARTMENTS[0]))
  const dateVal = isEditing ? parseDate(record) : TODAY
  const rawNotes = isEditing ? parseNoteText(record) : ''

  const [form, setForm] = useState({
    department: defaultDept,
    category:   record?.category || 'electricity',
    quantity:   record?.quantity !== undefined ? String(record.quantity) : '',
    date:       dateVal || TODAY,
    notes:      rawNotes === '—' ? '' : rawNotes,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const activeType = TYPES.find((t) => t.value === form.category) || TYPES[0]

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) {
      setError('Please enter a valid positive consumption quantity.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        department:    isAdmin ? form.department : userDept,
        resource_name: isAdmin ? form.department : userDept,
        category:      form.category,
        quantity:      Number(form.quantity),
        unit:          activeType.unit,
        notes:         [form.date, form.notes].filter(Boolean).join(' — ') || undefined,
        date:          form.date,
      }

      if (isEditing) {
        await api.patch(`/api/records/${record.id}`, payload)
        onSuccess(`Record updated — ${payload.department} · ${payload.category}`)
      } else {
        await api.post('/api/records', payload)
        onSuccess(`Record logged — ${payload.department} · ${payload.category} · ${payload.quantity} ${activeType.unit}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalBackdrop}>
      <div className="card fade-in" style={modalBox}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: 'rgba(30, 77, 56, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-brand)' }}>
              {isEditing ? <Pencil size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2.5} />}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, margin: 0 }}>
              {isEditing ? 'Edit Meter Reading' : 'Log Meter Reading'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(220, 38, 38, 0.08)', color: '#DC2626', borderRadius: 5, fontSize: 12, marginBottom: 14 }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 12 }}>
            <label style={filterLabel}>Building / Block</label>
            {isAdmin ? (
              <select
                name="department"
                className="input"
                value={form.department}
                onChange={handleChange}
                style={{ cursor: 'pointer' }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <div className="input" style={{ background: 'var(--color-surface-recessed)', fontWeight: 600, color: 'var(--color-text)', cursor: 'default' }}>
                📍 {userDept}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={filterLabel}>Resource Type</label>
            <select
              name="category"
              className="input"
              value={form.category}
              onChange={handleChange}
              style={{ cursor: 'pointer' }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={filterLabel}>Consumption Amount ({activeType.unit})</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                name="quantity"
                className="input"
                value={form.quantity}
                onChange={handleChange}
                placeholder="e.g. 320.5"
                min="0"
                step="any"
                required
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              <div style={{ padding: '7px 12px', background: 'var(--color-surface-recessed)', border: '1px solid var(--color-card-border)', borderRadius: 'var(--radius-button)', fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {activeType.unit}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={filterLabel}>Reading Date</label>
            <input
              type="date"
              name="date"
              className="input"
              value={form.date}
              onChange={handleChange}
              max={TODAY}
              required
              style={{ cursor: 'pointer' }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={filterLabel}>Notes (optional)</label>
            <input
              type="text"
              name="notes"
              className="input"
              value={form.notes}
              onChange={handleChange}
              placeholder="e.g. Routine meter check after maintenance"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Log Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({ record, onConfirm, onCancel }) {
  return (
    <div style={modalBackdrop}>
      <div className="card fade-in" style={{ ...modalBox, maxWidth: 380 }}>
        <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(194, 84, 71, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-alert)', marginBottom: 12 }}>
          <Trash2 size={18} strokeWidth={2} />
        </div>
        <h2 className="font-pachama-display" style={{ fontSize: 15, margin: '0 0 6px 0', color: 'var(--color-text)' }}>
          DELETE METER RECORD?
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.55, margin: '0 0 18px 0' }}>
          Are you sure you want to delete this telemetry record ({record.resource_name} · {record.category?.toUpperCase()} · {record.quantity} {record.unit || ''})?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{ background: 'var(--color-accent-alert)', color: '#FFFFFF', border: 'none' }}
          >
            DELETE RECORD
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk CSV Modal ────────────────────────────────────────────────────────────
function CsvModal({ onClose, onSuccess, showToast }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  function handleFile(f) {
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      showToast('error', 'Please select a valid .csv file.')
      return
    }
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/api/records/bulk-upload', fd)
      onSuccess(data.inserted)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'CSV upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modalBackdrop}>
      <div className="card fade-in" style={{ ...modalBox, maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-waste)' }}>
              <UploadCloud size={15} strokeWidth={2} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, margin: 0 }}>
              Bulk Telemetry Import
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          style={{
            border: `2px dashed ${dragging ? 'var(--color-waste)' : file ? 'var(--color-accent-brand)' : 'var(--color-card-border)'}`,
            borderRadius: 'var(--radius-card)',
            padding: '24px 18px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(5, 150, 105, 0.05)' : file ? 'rgba(30, 77, 56, 0.04)' : 'var(--color-surface-recessed)',
            marginBottom: 14,
          }}
        >
          <UploadCloud size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 8px' }} />
          {file ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent-brand)', marginBottom: 2 }}>{file.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{(file.size / 1024).toFixed(1)} KB</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>Drop CSV file here</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>or click to browse — max 5 MB</div>
            </>
          )}
          <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        <div style={{ padding: '8px 12px', background: 'var(--color-surface-recessed)', borderRadius: 5, marginBottom: 16, fontSize: 11, color: 'var(--color-text-muted)' }}>
          Expected CSV columns: <code style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>department, type, amount, date</code>
          <div style={{ marginTop: 4 }}>
            <a href="/sample-data.csv" download style={{ color: 'var(--color-accent-brand)', fontWeight: 600, textDecoration: 'none' }}>
              ↓ Download sample template (.csv)
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Importing…' : 'Upload CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const filterLabel = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: 4,
  fontFamily: 'var(--font-mono)',
}

const th = {
  padding:       '8px 14px',
  textAlign:     'left',
  fontFamily:    'var(--font-mono)',
  fontWeight:    700,
  fontSize:      10.5,
  color:         'var(--color-text-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const td = {
  padding:       '10px 14px',
  verticalAlign: 'middle',
  fontFamily:    'var(--font-body)',
  fontSize:      12.5,
  color:         'var(--color-text)',
}

const actionBtnStyle = {
  width: 26,
  height: 26,
  borderRadius: 4,
  border: '1px solid var(--color-card-border)',
  background: 'transparent',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  transition: 'all 0.15s ease',
}

const modalBackdrop = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(27, 43, 34, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
}

const modalBox = {
  width: '100%',
  maxWidth: 440,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: 'var(--color-surface)',
  borderRadius: 8,
  padding: 22,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
  border: '1px solid var(--color-card-border)',
}
