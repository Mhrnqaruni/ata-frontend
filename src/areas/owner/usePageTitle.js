// Sets the browser tab's title on an admin page: "{Page} · Admin · MySmartTeach" (design §3.0).
// Area: owner

import { useEffect } from 'react';

export default function usePageTitle(page) {
  useEffect(() => {
    const before = document.title;
    document.title = page ? `${page} · Admin · MySmartTeach` : 'Admin · MySmartTeach';
    return () => {
      document.title = before;
    };
  }, [page]);
}
