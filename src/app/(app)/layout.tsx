import { Header } from "@/components/Header";

/** App shell for full-screen tools: header only, no footer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-chrome">
      <Header />
      {children}
    </div>
  );
}
