

import React, { useMemo, useState } from 'react'

// ----- Data model helpers -----

// Build hotel structure: floors 1-9 have 10 rooms (x01..x10), floor 10 has 7 rooms (1001..1007)
function buildHotel() {
  const rooms = []
  for (let f = 1; f <= 9; f++) {
    for (let i = 1; i <= 10; i++) {
      const num = f * 100 + i
      rooms.push({ id: `${num}`, floor: f, num, pos: i - 1 }) // pos 0..9, 0 is nearest to stairs/lift at left
    }
  }
  for (let i = 1; i <= 7; i++) {
    const num = 1000 + i
    rooms.push({ id: `${num}`, floor: 10, num, pos: i - 1 }) // pos 0..6
  }
  return rooms
}

const ALL_ROOMS = buildHotel()

// Distance between two rooms, using rules: horizontal 1 per room, vertical 2 per floor via stairs on left.
function dist(a, b) {
  if (a.floor === b.floor) return Math.abs(a.pos - b.pos)
  return a.pos + b.pos + 2 * Math.abs(a.floor - b.floor)
}

// Evaluate a set by the diameter (max pairwise distance), representing "travel time between first and last room".
function diameter(set) {
  if (set.length <= 1) return 0
  let d = 0
  for (let i = 0; i < set.length; i++) {
    for (let j = i + 1; j < set.length; j++) {
      d = Math.max(d, dist(set[i], set[j]))
    }
  }
  return d
}

// Choose n rooms on a single floor minimizing span (max pos - min pos) among available.
// roomsOnFloor: sorted by pos ascending
function bestWindowOnFloor(roomsOnFloor, n) {
  if (roomsOnFloor.length < n) return null
  let best = null
  for (let i = 0; i + n - 1 < roomsOnFloor.length; i++) {
    const slice = roomsOnFloor.slice(i, i + n)
    const span = slice[slice.length - 1].pos - slice[0].pos
    if (!best || span < best.span) best = { span, pick: slice }
  }
  return best ? best.pick : null
}

// Greedy cross-floor heuristic: center around candidate floor, fill with leftmost rooms from nearby floors to minimize diameter.
function crossFloorPick(availableByFloor, n, centerFloor) {
  const floors = Object.keys(availableByFloor).map(f => +f).sort((a,b)=>a-b)
  const onCenter = availableByFloor[centerFloor] || []
  let bestSet = null
  let bestScore = Infinity

  // Try windows of size k on center floor (k from min(n, m) down to 1)
  for (let k = Math.min(n, onCenter.length); k >= Math.min(1, Math.min(n, onCenter.length)); k--) {
    const picksOnCenter = bestWindowOnFloor(onCenter, k) || onCenter.slice(0, k)
    // Now add remaining from nearest floors outward (center-1, center+1, ...)
    const need = n - k
    let result = [...picksOnCenter]
    if (need > 0) {
      for (let delta = 1; result.length < n && (centerFloor - delta >= 1 || centerFloor + delta <= 10); delta++) {
        for (let dir of [-1, 1]) {
          const f = centerFloor + dir * delta
          if (f < 1 || f > 10) continue
          const avail = (availableByFloor[f] || [])
          // pick the leftmost available first to minimize distance to stairs
          for (let r of avail) {
            if (result.length < n) result.push(r)
            else break
          }
          if (result.length >= n) break
        }
      }
    }
    const score = diameter(result)
    if (result.length === n && score < bestScore) {
      bestScore = score
      bestSet = result
    }
  }

  // Fallback: just fill from floors by proximity if we never filled via windows
  if (!bestSet) {
    let result = []
    // prioritize center floor then nearest
    const order = [centerFloor]
    for (let d = 1; d < 10; d++) {
      if (centerFloor - d >= 1) order.push(centerFloor - d)
      if (centerFloor + d <= 10) order.push(centerFloor + d)
    }
    for (let f of order) {
      const avail = (availableByFloor[f] || [])
      for (let r of avail) {
        result.push(r)
        if (result.length === n) break
      }
      if (result.length === n) break
    }
    if (result.length === n) bestSet = result
  }
  return bestSet
}

// Master booking function following the problem rules
function pickRooms(availableRooms, n) {
  if (n <= 0 || n > 5) return []
  // Build by-floor maps and sort by pos (left to right)
  const byFloor = {}
  for (const r of availableRooms) {
    if (!byFloor[r.floor]) byFloor[r.floor] = []
    byFloor[r.floor].push(r)
  }
  for (const f in byFloor) byFloor[f].sort((a,b)=>a.pos-b.pos)

  // Rule 2: Try to book on the same floor first
  let bestSame = null
  let bestSameSpan = Infinity
  for (const f in byFloor) {
    const pick = bestWindowOnFloor(byFloor[f], n)
    if (pick) {
      const span = pick[pick.length - 1].pos - pick[0].pos
      if (span < bestSameSpan) {
        bestSameSpan = span
        bestSame = pick
      }
    }
  }
  if (bestSame) return bestSame

  // Rule 3 & 4: Span across floors minimizing travel time between first and last (diameter)
  // Try multiple center floors: those with highest availability first
  const floorsByAvailability = Object.entries(byFloor)
    .map(([f, arr]) => ({ f: +f, count: arr.length }))
    .sort((a,b)=> b.count - a.count || a.f - b.f)
  const candidateCenters = floorsByAvailability.slice(0, Math.min(4, floorsByAvailability.length)).map(x=>x.f)
  let best = null
  let bestScore = Infinity

  for (const center of candidateCenters) {
    const pick = crossFloorPick(byFloor, n, center)
    if (pick && pick.length === n) {
      const score = diameter(pick)
      if (score < bestScore) {
        bestScore = score
        best = pick
      }
    }
  }

  // Extra attempt: brute-force small search when availableRooms is small (<= 26 choose n)
  if (!best && availableRooms.length <= 26) {
    // generate combinations (lexicographically)
    const arr = availableRooms.slice()
    const idx = []
    for (let i=0;i<n;i++) idx[i]=i
    const combos = []
    function pushCombo() {
      combos.push(idx.map(i=>arr[i]))
    }
    pushCombo()
    
  }

  return best || []
}

// Utility to generate random occupancy
function randomizeOccupancy(prob=0.25) {
  const occ = new Set()
  for (const r of ALL_ROOMS) {
    if (Math.random() < prob) occ.add(r.id)
  }
  return occ
}

function formatMinutes(m){ return `${m} min` }

// ----- React UI -----
export default function App(){
  const [occupied, setOccupied] = useState(()=>new Set()) // Set of room.id
  const [booked, setBooked] = useState([]) // array of room objects currently booked by last action
  const [count, setCount] = useState(1)

  const availableRooms = useMemo(()=>{
    return ALL_ROOMS.filter(r => !occupied.has(r.id) && !booked.some(b=>b.id===r.id))
  }, [occupied, booked])

  const availableByFloor = useMemo(()=>{
    const map = {}
    for(const r of availableRooms){
      map[r.floor] = (map[r.floor]||0)+1
    }
    return map
  }, [availableRooms])

  const totalTravel = useMemo(()=>{
    return formatMinutes(diameter(booked))
  }, [booked])

  function handleBook(){
    const n = Math.max(1, Math.min(5, Number(count)||1))
    const pick = pickRooms(availableRooms, n)
    if (!pick || pick.length !== n) {
      alert('Not enough rooms available to satisfy this booking.')
      return
    }
    setBooked(pick)
    // mark booked rooms as occupied (persist the booking)
    const next = new Set(occupied)
    for (const r of pick) next.add(r.id)
    setOccupied(next)
  }

  function handleRandom(){
    setBooked([])
    setOccupied(randomizeOccupancy(0.35))
  }

  function handleReset(){
    setBooked([])
    setOccupied(new Set())
  }

  return (
    <div className="container">
      <div className="h1">Hotel Room Reservation System</div>
      <div className="sub">97 rooms • Floors 1–9: 10 rooms each • Floor 10: 7 rooms • Stairs/Lift at the left</div>

      <div className="card">
        <div className="controls">
          <label>
            Rooms to book (1–5)
            <input type="number" min={1} max={5} value={count}
              onChange={(e)=>setCount(e.target.value)} />
          </label>
          <button className="btn primary" onClick={handleBook}>Book Optimally</button>
          <button className="btn" onClick={handleRandom}>Random Occupancy</button>
          <button className="btn ghost" onClick={handleReset}>Reset All</button>
        </div>

        <hr/>

        <div className="legend">
          <span><i className="badge available"></i> Available</span>
          <span><i className="badge booked"></i> Newly Booked</span>
          <span><i className="badge occupied"></i> Occupied</span>
          <span>Available by floor: {Object.entries(availableByFloor).sort((a,b)=>a[0]-b[0]).map(([f,c])=>`F${f}:${c}`).join('  ') || '—all full—'}</span>
          <span>Total travel time for last booking: <b>{totalTravel}</b></span>
        </div>

        <div className="grid">
          {[...Array(10)].map((_, idx) => {
            const floor = idx+1
            const roomsOnFloor = ALL_ROOMS.filter(r=>r.floor===floor)
            return (
              <div key={floor} className="row">
                <div className="label">F{floor}</div>
                {roomsOnFloor.map((r, i) => {
                  const isBooked = booked.some(b=>b.id===r.id)
                  const isOccupied = occupied.has(r.id) && !isBooked
                  const cls = "room " + (isBooked ? "booked" : isOccupied ? "occupied" : "available")
                  return (
                    <div key={r.id} className={cls}>
                      <div className="num">{r.num}</div>
                    </div>
                  )
                })}
                {floor===1 && <div className="stairs">⬅ Stairs / Lift</div>}
              </div>
            )
          })}
        </div>

        <div className="footer">Rule summary: prefer same-floor windows; otherwise minimize diameter (combined vertical and horizontal minutes) between first and last room.</div>
      </div>
    </div>
  )
}
