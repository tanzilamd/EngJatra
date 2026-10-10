import { Component, type ReactNode } from "react";
export const bn = (n: number) => n.toLocaleString("bn-BD");
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`notice ${error ? "error" : ""}`}
    >
      {children}
    </p>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p>{children}</p>
    </Card>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>একটি সমস্যা হয়েছে</h1>
        <p>তোমার সংরক্ষিত অগ্রগতি মুছে যায়নি।</p>
        <button onClick={() => location.reload()}>আবার খুলে দেখি</button>
      </main>
    ) : (
      this.props.children
    );
  }
}

export function Loading({ label = "পাঠ খুলছি…" }: { label?: string }) {
  return (
    <div className="card" role="status" aria-label={label}>
      <p className="muted small">{label}</p>
      <div className="skeleton heading" />
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}
