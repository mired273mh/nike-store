export default function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center gap-2 py-6">
      <button
        type="button"
        className="border px-3 py-2 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Trước
      </button>
      {Array.from({ length: pages }, (_, index) => index + 1)
        .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
        .map((n, index, numbers) => (
          <span key={n} className="inline-flex gap-2 items-center">
            {index > 0 && n - numbers[index - 1] > 1 && <span>…</span>}
            <button
              type="button"
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Trang ${n}`}
              className={`border min-w-10 px-3 py-2 ${page === n ? 'bg-foreground text-background' : ''}`}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          </span>
        ))}
      <button
        type="button"
        className="border px-3 py-2 disabled:opacity-40"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}
