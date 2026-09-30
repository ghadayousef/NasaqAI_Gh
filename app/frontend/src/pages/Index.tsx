import { useEffect } from 'react';
import { client } from '../lib/api';

/** Routes the root URL into the static Nasaq pages based on the Atoms session. */
export default function Index() {
  useEffect(() => {
    client.auth
      .me()
      .then((res) => {
        const next = sessionStorage.getItem('nasaq-next') || '#/overview';
        sessionStorage.removeItem('nasaq-next');
        window.location.replace(res?.data ? `/dashboard/index.html${next}` : '/landing/index.html');
      })
      .catch(() => window.location.replace('/landing/index.html'));
  }, []);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#fdf8ee] text-[#14283e]">
      <p className="font-bold">جارٍ فتح نسق…</p>
    </div>
  );
}
