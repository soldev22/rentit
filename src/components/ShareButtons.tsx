"use client";

export default function ShareButtons({ title }: { title?: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';

  function share(platform: 'twitter' | 'facebook') {
    const text = title ? `${title} - ` : '';
    const encoded = encodeURIComponent(text + url);
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <button onClick={() => share('twitter')} className="rounded-md bg-sky-500 px-3 py-1 text-white text-sm">Share</button>
      <button onClick={() => share('facebook')} className="rounded-md bg-blue-600 px-3 py-1 text-white text-sm">FB</button>
    </div>
  );
}
