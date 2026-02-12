const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Cell width + gap: 12px + 2px = 14px on desktop, 10px + 2px = 12px on mobile
// Day labels add ~28px margin on md+, 0 on mobile (hidden)

export default function MonthLabels({ gridData }) {
  if (!gridData || gridData.length === 0) return null

  const labels = []
  let lastMonth = null

  for (let w = 0; w < gridData.length; w++) {
    const firstDayOfWeek = gridData[w][0]
    const month = new Date(firstDayOfWeek.date + 'T00:00:00').getMonth()

    if (month !== lastMonth) {
      labels.push({ weekIndex: w, label: MONTHS[month] })
      lastMonth = month
    }
  }

  return (
    <>
      {/* Mobile: no day labels offset */}
      <div className="flex md:hidden text-[10px] text-text-secondary select-none">
        {labels.map(({ weekIndex, label }, i) => {
          const nextStart = i + 1 < labels.length ? labels[i + 1].weekIndex : gridData.length
          const span = nextStart - weekIndex
          return (
            <div
              key={`m-${label}-${weekIndex}`}
              style={{ width: `${span * 12}px` }}
              className="whitespace-nowrap overflow-hidden"
            >
              {label}
            </div>
          )
        })}
      </div>
      {/* Desktop: with day labels offset */}
      <div className="hidden md:flex text-[10px] text-text-secondary select-none" style={{ marginLeft: '28px' }}>
        {labels.map(({ weekIndex, label }, i) => {
          const nextStart = i + 1 < labels.length ? labels[i + 1].weekIndex : gridData.length
          const span = nextStart - weekIndex
          return (
            <div
              key={`d-${label}-${weekIndex}`}
              style={{ width: `${span * 14}px` }}
              className="whitespace-nowrap overflow-hidden"
            >
              {label}
            </div>
          )
        })}
      </div>
    </>
  )
}
