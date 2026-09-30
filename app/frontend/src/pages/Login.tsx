import { useEffect } from 'react';
import { client } from '../lib/api';

/** Starts the Atoms Cloud login flow; the callback returns to "/" which opens the dashboard. */
export default function Login() {
  useEffect(() => {
    client.auth.toLogin();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#fdf8ee] text-[#14283e]">
      <p className="font-bold">جارٍ تحويلك لتسجيل الدخول…</p>
    </div>
  );
}
