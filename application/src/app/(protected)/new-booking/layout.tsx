import AppShell from "@/components/AppShell";

export default function NewBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
