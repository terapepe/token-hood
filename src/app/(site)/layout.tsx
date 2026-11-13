import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getHoodInfo } from "@/lib/hood-live";

/** HOOD TERMINAL chrome (header + footer). */

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const info = await getHoodInfo();
  return (
    <div className="site-chrome">
      <Header />
      {children}
      <Footer info={info} />
    </div>
  );
}
