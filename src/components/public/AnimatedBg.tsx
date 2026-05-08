export function AnimatedBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#fafbff]" />
      <div className="absolute w-[900px] h-[900px] rounded-full opacity-[0.07]" style={{
        background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)',
        top: '-15%', right: '-10%',
        animation: 'orbFloat1 22s ease-in-out infinite',
      }} />
      <div className="absolute w-[700px] h-[700px] rounded-full opacity-[0.05]" style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%)',
        bottom: '0%', left: '-8%',
        animation: 'orbFloat2 28s ease-in-out infinite',
      }} />
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{
        background: 'radial-gradient(circle, rgba(244,114,182,0.7) 0%, transparent 65%)',
        top: '50%', left: '40%',
        animation: 'orbFloat3 24s ease-in-out infinite',
      }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.4) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <style>{`
        @keyframes orbFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -40px) scale(1.05); } 66% { transform: translate(-20px, 20px) scale(0.95); } }
        @keyframes orbFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.08); } 66% { transform: translate(25px, -25px) scale(0.92); } }
        @keyframes orbFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(25px, 35px) scale(1.03); } 66% { transform: translate(-35px, -15px) scale(0.97); } }
      `}</style>
    </div>
  )
}
