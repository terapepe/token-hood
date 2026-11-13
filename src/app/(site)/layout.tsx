import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/** HOOD TERMINAL chrome (header + footer). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-chrome">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
