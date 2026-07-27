export function pad2(value) {
  if (value < 10) {
    return '0' + value
  }
  return String(value)
}

export function toDateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

export function monthLabel(year, month) {
  const date = new Date(year, month, 1)
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export function getMonthRange(year, month) {
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  }
}

export function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstDay.getDay()
  const cells = []
  let index = 0

  while (index < startWeekday) {
    cells.push({ key: 'empty-' + index, day: null, dateKey: null })
    index = index + 1
  }

  let day = 1
  while (day <= daysInMonth) {
    const dateKey = year + '-' + pad2(month + 1) + '-' + pad2(day)
    cells.push({ key: dateKey, day: day, dateKey: dateKey })
    day = day + 1
  }

  return cells
}

export function formatPostTime(iso) {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function toDateTimeLocalValue(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + 'T' + pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}
