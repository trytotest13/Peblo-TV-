/**
 * Viewer Profile page tests.
 *
 * Mocks the api module so auth flows run against in-memory responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>()
  return {
    ...actual,
    login: vi.fn(),
    register: vi.fn(),
    fetchMe: vi.fn(),
    fetchMyList: vi.fn(),
  }
})

import * as api from '../../api'
import Profile from '../Profile'

const MOCK_ME: api.ViewerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'ankit@example.com',
  role: 'editor',
  is_active: true,
}

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

describe('Profile page', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the sign-in form for guests', () => {
    render(
      <TestWrapper>
        <Profile />
      </TestWrapper>
    )
    expect(screen.getByRole('heading', { name: /sign in/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByText(/ synced$/)).not.toBeInTheDocument()
  })

  it('signs in and shows account details', async () => {
    vi.mocked(api.login).mockImplementation(async (email: string) => {
      localStorage.setItem('peblo_token', 'tok')
      localStorage.setItem('peblo_user', JSON.stringify({ name: email.split('@')[0], email }))
      return 'tok'
    })
    vi.mocked(api.fetchMe).mockResolvedValue(MOCK_ME)
    vi.mocked(api.fetchMyList).mockResolvedValue({ slugs: ['moti'] })
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Profile />
      </TestWrapper>
    )

    await user.type(screen.getByLabelText(/email/i), 'ankit@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    // [0] is the Sign In mode tab, [1] is the form submit button.
    await user.click(screen.getAllByRole('button', { name: /^sign in$/i })[1])

    expect(await screen.findByText('ankit@example.com')).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith('ankit@example.com', 'secret123')
    expect(localStorage.getItem('peblo_token')).toBe('tok')
    await waitFor(() => expect(screen.getByText(/1 show synced/i)).toBeInTheDocument())
  })

  it('surfaces sign-in failures from the API', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Invalid email or password'))
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Profile />
      </TestWrapper>
    )

    await user.type(screen.getByLabelText(/email/i), 'ankit@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    // [0] is the Sign In mode tab, [1] is the form submit button.
    await user.click(screen.getAllByRole('button', { name: /^sign in$/i })[1])

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /sign in/i, level: 1 })).toBeInTheDocument()
  })

  it('shows the signed-in account view', async () => {
    localStorage.setItem('peblo_token', 'tok')
    localStorage.setItem(
      'peblo_user',
      JSON.stringify({ name: 'Ankit', email: 'ankit@example.com' })
    )
    vi.mocked(api.fetchMe).mockResolvedValue(MOCK_ME)
    vi.mocked(api.fetchMyList).mockResolvedValue({ slugs: ['a', 'b'] })

    render(
      <TestWrapper>
        <Profile />
      </TestWrapper>
    )

    expect(await screen.findByText('ankit@example.com')).toBeInTheDocument()
    expect(await screen.findByText(/2 shows synced/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('falls back to the guest view when the session is stale', async () => {
    localStorage.setItem('peblo_token', 'stale')
    vi.mocked(api.fetchMe).mockRejectedValue(new Error('Session expired'))

    render(
      <TestWrapper>
        <Profile />
      </TestWrapper>
    )

    expect(await screen.findByRole('heading', { name: /^sign in$/i, level: 1 })).toBeInTheDocument()
    expect(localStorage.getItem('peblo_token')).toBeNull()
  })
})
