'use client';

export function ConfirmButton({ message, children, className = 'btn btn-danger btn-xs' }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
