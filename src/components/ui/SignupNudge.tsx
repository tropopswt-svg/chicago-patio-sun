"use client";

interface SignupNudgeProps {
  show: boolean;
  onDismiss: () => void;
  onOpenAuth: () => void;
}

export function SignupNudge({ show, onDismiss, onOpenAuth }: SignupNudgeProps) {
  if (!show) return null;

  return (
    <div className="absolute bottom-28 sm:bottom-14 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm"
        style={{
          background: "linear-gradient(160deg, rgba(15, 15, 35, 0.5) 0%, rgba(255, 255, 255, 0.06) 100%)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "0.5px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <button
          onClick={onOpenAuth}
          className="text-white/70 font-medium hover:text-white/90 transition-colors"
        >
          Sign up to save your favorite bars
        </button>
        <button
          onClick={onDismiss}
          className="ml-1 w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors text-sm shrink-0"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
