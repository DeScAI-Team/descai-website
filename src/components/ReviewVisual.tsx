import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { ReviewVisualMode } from "@/api/reviewVisualMatcher";

type ReviewVisualBadge = "featured" | "on-chain";

type ReviewVisualProps = {
  imageUrl?: string | null;
  visualMode?: ReviewVisualMode;
  badge?: ReviewVisualBadge;
  /** Show loading shell while an image is expected but not yet available. */
  expectImage?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

const ReviewVisual = ({
  imageUrl,
  visualMode = "structure",
  badge = "featured",
  expectImage = false,
  fetchPriority = "auto"
}: ReviewVisualProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const isCover = visualMode === "cover";
  const useImageShell = expectImage || Boolean(imageUrl);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const pendingImage = expectImage && !imageUrl && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [imageUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [imageUrl]);

  return (
    <div
      className={clsx(
        "featured-visual min-h-[190px] overflow-hidden rounded-[18px] border border-[#4867af]/45 shadow-[0_20px_44px_rgba(0,0,0,0.34)]",
        useImageShell && !isCover && "featured-visual--structure"
      )}
    >
      {pendingImage && (
        <div
          className={clsx(
            "absolute inset-0 z-[1] animate-pulse",
            isCover ? "bg-[#1a2247]" : "bg-[#e8eefb]"
          )}
          aria-hidden="true"
        />
      )}
      {showImage && imageUrl && (
        <>
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            className={clsx(
              "absolute inset-0 z-[1] h-full w-full transition-opacity duration-300",
              isCover ? "object-cover" : "bg-[#f4f7ff] object-contain p-3",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="eager"
            decoding="async"
            fetchPriority={fetchPriority}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
          {isCover && (
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#06122d]/72 via-transparent to-transparent"
              aria-hidden="true"
            />
          )}
        </>
      )}
      <span className="relative z-10 inline-flex items-center gap-2 rounded-r-full bg-[#6938e8] px-4 py-2 text-xs font-semibold text-[#eef4ff] shadow-[0_8px_24px_rgba(79,52,225,0.36)]">
        {badge === "featured" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="m12 3 2.7 5.7 6.3.8-4.6 4.4 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.5l6.3-.8L12 3Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M12 3v18M3 12h18" />
          </svg>
        )}
        {badge === "featured" ? "Featured" : "On-chain"}
      </span>
    </div>
  );
};

export default ReviewVisual;
