export default function DayLabels() {
  return (
    <div className="hidden md:flex flex-col mr-1 text-[10px] text-text-secondary select-none" style={{ gap: '2px' }}>
      <div className="h-[10px] md:h-3 leading-3">Mon</div>
      <div className="h-[10px] md:h-3 leading-3 invisible">Tue</div>
      <div className="h-[10px] md:h-3 leading-3">Wed</div>
      <div className="h-[10px] md:h-3 leading-3 invisible">Thu</div>
      <div className="h-[10px] md:h-3 leading-3">Fri</div>
      <div className="h-[10px] md:h-3 leading-3 invisible">Sat</div>
      <div className="h-[10px] md:h-3 leading-3 invisible">Sun</div>
    </div>
  )
}
