"use client";

export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 10, fontFamily: "var(--mono)", textTransform: "uppercase",
      letterSpacing: "0.1em", color: "var(--gray-700)", fontWeight: 600, marginBottom: 16,
    }}>{children}</h3>
  );
}
