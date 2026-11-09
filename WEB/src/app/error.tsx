'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-20 px-4">
      <h1 className="font-black text-2xl mb-4">Chưa tải được dữ liệu</h1>
      <p className="text-muted-foreground mb-5">Vui lòng thử lại sau ít phút.</p>
      <button className="border px-5 py-3 font-bold" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
