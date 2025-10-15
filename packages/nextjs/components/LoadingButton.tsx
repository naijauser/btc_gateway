"use client";

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export default function LoadingButton({
  loading = false,
  children,
  className = "",
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`w-full btn bg-btn-wallet text-primary-content font-semibold border-none py-3 rounded-full hover:opacity-90 transition-all relative flex items-center justify-center ${className}`}
      {...props}
    >
      {loading && (
        <span className="absolute left-4 w-5 h-5 border-2 border-t-transparent border-primary-content rounded-full animate-spin"></span>
      )}
      <span className={loading ? "opacity-50" : ""}>{children}</span>
    </button>
  );
}
