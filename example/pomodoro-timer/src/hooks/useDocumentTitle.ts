import { useEffect } from 'react'

/** Sets `document.title`; the text comes from `titleFor`, never from storage (POMO-E12). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
