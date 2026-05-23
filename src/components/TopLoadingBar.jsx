export default function TopLoadingBar() {
  return (
    <div
      aria-label="불러오는 중"
      className="fixed left-0 right-0 top-0 z-[100] h-1 overflow-hidden bg-primary-100"
      role="status"
    >
      <div className="top-loading-bar h-full w-1/3 bg-action-default" />
    </div>
  )
}
