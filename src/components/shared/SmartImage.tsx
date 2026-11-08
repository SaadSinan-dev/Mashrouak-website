import { useState, type ImgHTMLAttributes } from 'react';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  width: number;
  height: number;
  priority?: boolean;
  fallbackLabel?: string;
}

export function SmartImage({ src, width, height, priority = false, fallbackLabel = 'Image unavailable', className = '', alt = '', ...props }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <span className={`smart-image ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
    {!loaded && !failed && <span className="smart-image__skeleton" aria-hidden="true" />}
    {failed ? <span className="smart-image__fallback" role="img" aria-label={fallbackLabel}>◇</span> : <img {...props} src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`smart-image__asset${loaded ? ' is-loaded' : ''}`} />}
  </span>;
}
