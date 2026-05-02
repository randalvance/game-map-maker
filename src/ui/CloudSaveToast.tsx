import { useEffect, useState } from "react";

type Props = {
  url: string;
  onDismiss: () => void;
};

export function CloudSaveToast({ url, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Fallback: select the input so the user can copy manually
      setCopied(false);
    }
  };

  return (
    <div className="toast toast--success" role="status">
      <div className="toast__title">Saved to cloud</div>
      <div className="toast__row">
        <input
          type="text"
          readOnly
          value={url}
          className="toast__url"
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Cloud project URL"
        />
        <button
          type="button"
          className="btn btn--small"
          onClick={handleCopy}
          aria-label="Copy URL"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
