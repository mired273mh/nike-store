'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { apiJson, jsonBody } from '@/lib/api';
import type { UserSession } from '@/lib/types';
export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setStep(1);
    setError('');
    setMessage('');
    setPassword('');
    setOtp('');
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'reset') {
        const data = await apiJson<{ message: string }>(
          '/api/auth/reset-password',
          jsonBody(
            'POST',
            step === 1 ? { email, checkEmailOnly: true } : { email, otp, newPassword: password },
          ),
        );
        setMessage(data.message);
        if (step === 1) setStep(2);
        else {
          loginUser(null);
          setMode('login');
          setPassword('');
          setStep(1);
        }
      } else {
        const data = await apiJson<{ user: UserSession }>(
          `/api/auth/${mode}`,
          jsonBody('POST', { name, email, password }),
        );
        loginUser(data.user);
        router.push(data.user.role === 'admin' ? '/admin' : '/');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  }
  const input = 'w-full border px-4 py-3 focus:outline-none focus:border-brand-red';
  return (
    <div className="w-full max-w-md mx-auto px-4 py-14">
      <p className="text-brand-red uppercase tracking-widest text-xs font-bold mb-3">
        Nike Store / Tài khoản
      </p>
      <h1 className="text-3xl font-black uppercase mb-6">
        {mode === 'login'
          ? 'Đăng nhập'
          : mode === 'register'
            ? 'Tạo tài khoản'
            : 'Khôi phục mật khẩu'}
      </h1>
      <div className="flex border-b mb-6">
        <button
          className={`flex-1 py-3 font-bold ${mode === 'login' ? 'border-b-2 border-brand-red' : ''}`}
          onClick={() => changeMode('login')}
        >
          Đăng nhập
        </button>
        <button
          className={`flex-1 py-3 font-bold ${mode === 'register' ? 'border-b-2 border-brand-red' : ''}`}
          onClick={() => changeMode('register')}
        >
          Đăng ký
        </button>
      </div>
      {error && (
        <p role="alert" className="border border-red-300 bg-red-50 text-red-700 p-3 mb-4 text-sm">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="border border-green-300 bg-green-50 text-green-800 p-3 mb-4 text-sm"
        >
          {message}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <label className="block text-sm font-semibold">
            Họ và tên
            <input
              className={input}
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Email
          <input
            className={input}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
          />
        </label>
        {mode === 'reset' && step === 2 && (
          <label className="block text-sm font-semibold">
            Mã xác nhận
            <input
              className={input}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6 chữ số trong thư xác nhận"
            />
          </label>
        )}
        {(mode !== 'reset' || step === 2) && (
          <label className="block text-sm font-semibold">
            {mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
            <input
              className={input}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'login' ? 1 : 8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
          </label>
        )}
        {mode === 'reset' && (
          <p className="text-xs text-muted-foreground">
            Mã xác nhận có hiệu lực 10 phút và chỉ dùng một lần.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-foreground text-background p-3 font-bold uppercase disabled:opacity-50"
        >
          {busy
            ? 'Đang xử lý…'
            : mode === 'login'
              ? 'Đăng nhập'
              : mode === 'register'
                ? 'Đăng ký'
                : step === 1
                  ? 'Gửi mã xác nhận'
                  : 'Đổi mật khẩu'}
        </button>
      </form>
      {mode === 'login' && (
        <button className="text-sm underline mt-4" onClick={() => changeMode('reset')}>
          Quên mật khẩu?
        </button>
      )}
      <p className="mt-8 text-sm text-muted-foreground">
        Mua sắm giày và trang phục thể thao.{' '}
        <Link href="/products" className="underline">
          Xem bộ sưu tập
        </Link>
      </p>
    </div>
  );
}
