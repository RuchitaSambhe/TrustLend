export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/8 blur-3xl animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/8 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-amber-500/6 blur-3xl animate-blob animation-delay-4000" />
      <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] rounded-full bg-pink-500/5 blur-3xl animate-blob animation-delay-2000" style={{ animationDuration: '10s' }} />
    </div>
  );
}
