import { useEffect, useRef } from "react";
import { createPublicNetwork } from "./public-network-renderer";
import "./public-atmosphere.css";

export function PublicAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return createPublicNetwork(ref.current);
  }, []);
  return (
    <div ref={ref} className="public-atmosphere" aria-hidden="true">
      <canvas className="public-atmosphere__network" />
    </div>
  );
}
