import { useState } from 'react';
import './DevicePreview.css';

export function DevicePreview({
  images,
  category,
  title,
  arabic = false,
  gallery = false,
}: {
  images: string[];
  category: string;
  title: string;
  arabic?: boolean;
  gallery?: boolean;
}) {
  const [selected, select] = useState('');
  const [measured, measure] = useState({ url: '', ratio: 0 });
  const [failed, fail] = useState('');
  if (!images.length) return null;
  const index = Math.max(0, images.indexOf(selected));
  const url = images[index]!;
  const ratio = measured.url === url ? measured.ratio : 0;
  const phone = ratio ? ratio < 0.82 : category === 'mobile';
  const shape = phone
    ? 'phone'
    : ratio > 0.82 && ratio < 1.2
      ? 'canvas'
      : 'browser';
  function step(offset: number) {
    select(images[(index + offset + images.length) % images.length]!);
  }
  return (
    <div className="device-stage" data-shape={shape}>
      {failed === url ? (
        <button type="button" onClick={() => fail('')}>
          {arabic ? 'إعادة تحميل الصورة' : 'Reload preview'}
        </button>
      ) : (
        <div className="device-shell">
          <span className="device-chrome" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <img
            key={url}
            src={url}
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={(event) =>
              measure({
                url,
                ratio:
                  event.currentTarget.naturalWidth /
                  event.currentTarget.naturalHeight,
              })
            }
            onError={() => fail(url)}
          />
        </div>
      )}
      {gallery && images.length > 1 && (
        <div className="device-controls">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={arabic ? 'اللقطة السابقة' : 'Previous screenshot'}
          >
            {arabic ? '→' : '←'}
          </button>
          <output aria-live="polite" dir="ltr">
            {index + 1} / {images.length}
          </output>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={arabic ? 'اللقطة التالية' : 'Next screenshot'}
          >
            {arabic ? '←' : '→'}
          </button>
        </div>
      )}
    </div>
  );
}
