/**
 * Viewer Home page tests.
 *
 * Mocks the api module directly so the component renders against in-memory
 * catalogue data without any network or query cache plumbing.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Catalog, Show } from '../../api'

// Mock the api module — we want to control the data the component sees.
vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>()
  return {
    ...actual,
    fetchCatalog: vi.fn(),
    searchCatalog: vi.fn(),
    IMG: actual.IMG,
  }
})

import * as api from '../../api'
import Home from '../Home'

// ---------------------------------------------------------------------------
// Mock catalogue fixture
// ---------------------------------------------------------------------------

const MOCK_SHOWS: Show[] = [
  {
    slug: 'moti-ki-bhari',
    title: 'Moti Ki Bhari',
    synopsis: 'A story about a girl named Moti.',
    section: 'featured',
    categories: ['adventure'],
    rating: 'U',
    poster_url: '/media/poster.jpg',
    banner_url: '/media/banner.jpg',
    seasons: [
      {
        season_number: 1,
        episodes: [
          {
            slug: 'moti-ki-bhari-s01e01-hi',
            title: 'Episode 1',
            synopsis: 'The beginning.',
            episode_number: 1,
            season_number: 1,
            languages: [{ language: 'hi', episode_slug: 'mock' }],
          },
        ],
      },
    ],
  },
  {
    slug: 'chhota-bheem',
    title: 'Chhota Bheem',
    synopsis: 'An animated adventure series.',
    section: 'series',
    categories: ['adventure'],
    rating: 'U',
    poster_url: '/media/poster-bheem.jpg',
    seasons: [
      {
        season_number: 1,
        episodes: [
          {
            slug: 'chhota-bheem-s01e01-hi',
            title: 'Dragon Ball',
            synopsis: 'Bheem fights a dragon.',
            episode_number: 1,
            season_number: 1,
            languages: [{ language: 'hi', episode_slug: 'mock' }],
          },
        ],
      },
    ],
  },
  {
    slug: 'sonchiriya',
    title: 'Sonchiriya',
    synopsis: 'A nature documentary.',
    section: 'minisodes',
    categories: ['nature'],
    rating: 'U',
    seasons: [],
  },
]

const MOCK_CATALOG: Catalog = { shows: MOCK_SHOWS }

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home page', () => {
  it('renders the catalogue and shows all shows', async () => {
    vi.mocked(api.fetchCatalog).mockResolvedValue(MOCK_CATALOG)

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )

    // Shows should appear (may be in hero + section rows, so check length)
    const motiTitles = await screen.findAllByText('Moti Ki Bhari')
    expect(motiTitles.length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chhota Bheem').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sonchiriya').length).toBeGreaterThan(0)
  })

  it('filters catalogue by section pill', async () => {
    vi.mocked(api.fetchCatalog).mockResolvedValue(MOCK_CATALOG)

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )

    // Wait for initial load
    expect(await screen.findAllByText('Moti Ki Bhari'))

    // Click "Series" filter pill (find the one in the filter-row, not nav)
    const seriesBtns = screen.getAllByRole('button', { name: /^series$/i })
    const filterPill = seriesBtns.find((b) => b.classList.contains('filter-pill'))
    expect(filterPill).toBeDefined()
    await userEvent.click(filterPill!)

    // Only "Chhota Bheem" should be visible (it's the only series show)
    expect(await screen.findAllByText('Chhota Bheem'))
    expect(screen.queryAllByText('Moti Ki Bhari')).toHaveLength(0)
    expect(screen.queryAllByText('Sonchiriya')).toHaveLength(0)
  })

  it('shows empty state when no shows match search', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchCatalog).mockResolvedValue(MOCK_CATALOG)
    vi.mocked(api.searchCatalog).mockResolvedValue({ results: [] })

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )

    // Wait for initial load
    expect(await screen.findAllByText('Moti Ki Bhari'))

    // Search for something that doesn't exist — the debounce fires after 400 ms
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'xyznonexistent')

    await waitFor(
      () => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('navigates to show detail when a show card is clicked', async () => {
    vi.mocked(api.fetchCatalog).mockResolvedValue(MOCK_CATALOG)

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )

    // Wait for shows to appear
    expect(await screen.findAllByText('Moti Ki Bhari'))

    // Find the show card link
    const showLink = screen.getByRole('link', { name: /moti ki bhari/i })
    expect(showLink.getAttribute('href')).toBe('/show/moti-ki-bhari')
  })
})
