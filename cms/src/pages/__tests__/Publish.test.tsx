/**
 * CMS Publish page tests (queue / schedule / history tabs).
 *
 * 1. "Publish now" is disabled when validation reports issues.
 * 2. The schedule modal creates an entry.
 * 3. History renders a failed row's error detail on expand.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Publish from '../Publish'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AllTheProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

interface RecordedCall {
  url: string
  method: string
  body?: unknown
}

function mockFetch(responses: Record<string, unknown>) {
  const calls: RecordedCall[] = []
  const original = window.fetch.bind(window)
  window.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const raw = typeof url === 'string' ? url : url instanceof Request ? url.url : String(url)
    const method = init?.method || 'GET'
    let body: unknown
    try {
      body = init?.body ? JSON.parse(init.body as string) : undefined
    } catch {
      body = undefined
    }
    calls.push({ url: raw, method, body })
    const basePath = raw.split('?')[0]
    const hit =
      responses[raw] ??
      responses[basePath] ??
      responses[`${method} ${raw}`] ??
      responses[`${method} ${basePath}`]
    if (hit !== undefined) {
      if (hit instanceof Error) return Promise.reject(hit)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(typeof hit === 'function' ? hit(body) : hit),
      } as Response)
    }
    return original(url as Request)
  }) as typeof fetch
  return { calls, restore: () => (window.fetch = original) }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ISSUES_JOB = {
  id: 'job-1',
  title: 'Moti Adventures',
  item_type: 'show',
  item_id: 'show-1',
  requested_by: 'auto',
  requested_at: '2026-09-05T10:00:00Z',
  validation_status: 'issues',
  published_at: null,
  duration_ms: null,
  result: null,
  error_detail: null,
  issues: ['Show "Moti Adventures" is missing banner artwork.'],
}

const VALIDATED_JOB = {
  ...ISSUES_JOB,
  id: 'job-2',
  title: 'Curious Cubs',
  item_id: 'show-2',
  validation_status: 'validated',
  issues: [],
}

const FAILED_HISTORY = {
  items: [
    {
      title: 'Broken Push',
      item_type: 'catalogue',
      published_at: '2026-09-04T10:00:00Z',
      published_by: 'admin@peblo.local',
      duration_ms: 1200,
      result: 'failed',
      error_detail: 'Disk full while writing catalogue file.',
    },
  ],
  total: 1,
  cursor: 0,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Publish page', () => {
  beforeEach(() => {
    localStorage.setItem('peblo_token', 'mock-admin-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('disables "Publish now" when validation has issues', async () => {
    const { restore } = mockFetch({ '/api/publish/jobs?status=pending': [ISSUES_JOB] })
    try {
      render(
        <AllTheProviders>
          <Publish />
        </AllTheProviders>
      )

      const publishBtn = await screen.findByRole('button', { name: /publish now/i })
      expect(publishBtn).toBeDisabled()
      expect(publishBtn).toHaveAttribute('title', expect.stringMatching(/issues/i))

      // Issues expand to show what's missing
      fireEvent.click(screen.getByRole('button', { name: /view issues/i }))
      expect(await screen.findByText(/missing banner artwork/i)).toBeInTheDocument()
    } finally {
      restore()
    }
  })

  it('schedule modal creates an entry', async () => {
    const created = {
      id: 'sched-1',
      title: 'Curious Cubs',
      item_type: 'show',
      item_id: 'show-2',
      scheduled_for: new Date(Date.now() + 86400000).toISOString(),
      timezone_note: null,
      created_by: 'admin@peblo.local',
      status: 'scheduled',
      last_error: null,
      created_at: new Date().toISOString(),
    }
    const { calls, restore } = mockFetch({
      '/api/publish/jobs?status=pending': [VALIDATED_JOB],
      '/api/publish/schedule': [],
      'POST /api/publish/schedule': created,
    })
    try {
      render(
        <AllTheProviders>
          <Publish />
        </AllTheProviders>
      )

      fireEvent.click(await screen.findByRole('tab', { name: /schedule/i }))
      expect(await screen.findByRole('grid', { name: /weekly publish/i })).toBeInTheDocument()

      // Open the modal from an empty day slot
      fireEvent.click((await screen.findAllByText(/click to schedule/i))[0])
      expect(await screen.findByLabelText(/pick content/i)).toBeInTheDocument()

      // Pick validated content (search narrows the select, then choose it)
      fireEvent.change(screen.getByLabelText(/pick content/i), { target: { value: 'job-2' } })
      fireEvent.click(screen.getByRole('button', { name: /^schedule$/i }))

      await waitFor(() => {
        const post = calls.find((c) => c.url === '/api/publish/schedule' && c.method === 'POST')
        expect(post).toBeDefined()
        expect(post!.body).toMatchObject({ title: 'Curious Cubs', item_type: 'show' })
      })
    } finally {
      restore()
    }
  })

  it('history renders failed row error detail', async () => {
    const { restore } = mockFetch({
      '/api/publish/jobs?status=pending': [],
      '/api/publish/history?cursor=0&limit=20': FAILED_HISTORY,
    })
    try {
      render(
        <AllTheProviders>
          <Publish />
        </AllTheProviders>
      )

      fireEvent.click(await screen.findByRole('tab', { name: /history/i }))
      expect(await screen.findByText('Broken Push')).toBeInTheDocument()

      // Error detail hidden until the failed row expands
      expect(screen.queryByText(/disk full/i)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /^failed$/i }))
      expect(await screen.findByText(/disk full/i)).toBeInTheDocument()
    } finally {
      restore()
    }
  })
})
