'use client'

import { useEffect, useMemo, useState } from 'react'

export function usePagination(items, initialPageSize = 10, resetKey = '') {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => setPage(1), [resetKey, pageSize])
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  return { page, setPage, pageItems, pageSize, setPageSize, totalItems: items.length, totalPages }
}
