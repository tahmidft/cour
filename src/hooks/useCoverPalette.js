import { useEffect, useState } from "react";
import { getCoverPalette } from "../lib/coverColors";

export function useCoverPalette(coverUrl) {
  const [palette, setPalette] = useState(null);

  useEffect(() => {
    if (!coverUrl) {
      setPalette(null);
      return;
    }
    let active = true;
    getCoverPalette(coverUrl).then((result) => {
      if (active) setPalette(result);
    });
    return () => {
      active = false;
    };
  }, [coverUrl]);

  return palette;
}
