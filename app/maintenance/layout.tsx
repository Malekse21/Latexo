export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {children}
    </div>
  )
}
