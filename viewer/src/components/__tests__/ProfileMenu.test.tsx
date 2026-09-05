/**
 * ProfileMenu dropdown tests.
 *
 * Verifies every dropdown item performs a real action: navigation for
 * My Profile / My List / Settings, and session cleanup for Sign Out.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ProfileMenu from '../ProfileMenu'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderMenu(initialPath = '/') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<ProfileMenu />} />
        <Route path="/show/:slug" element={<ProfileMenu />} />
        {/* Destinations the dropdown navigates to — rendered as stubs so the
            router matches them instead of logging "No routes matched". */}
        <Route path="/profile" element={<ProfileMenu />} />
        <Route path="/my-list" element={<ProfileMenu />} />
        <Route path="/settings" element={<ProfileMenu />} />
      </Routes>
    </MemoryRouter>
  )
}

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /user profile/i }))
  return screen.getByRole('menu')
}

describe('ProfileMenu', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the avatar button with the dropdown closed', () => {
    renderMenu()
    expect(screen.getByRole('button', { name: /user profile/i })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('navigates to /profile from My Profile', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openDropdown(user)
    await user.click(screen.getByRole('menuitem', { name: /my profile/i }))
    expect(screen.getByTestId('location')).toHaveTextContent('/profile')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('navigates to /my-list from My List', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openDropdown(user)
    await user.click(screen.getByRole('menuitem', { name: /^my list$/i }))
    expect(screen.getByTestId('location')).toHaveTextContent('/my-list')
  })

  it('navigates to /settings from Settings', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openDropdown(user)
    await user.click(screen.getByRole('menuitem', { name: /^settings$/i }))
    expect(screen.getByTestId('location')).toHaveTextContent('/settings')
  })

  it('clears the session and goes home on Sign Out', async () => {
    localStorage.setItem('peblo_token', 'abc')
    localStorage.setItem('peblo_user', JSON.stringify({ name: 'Ankit', email: 'a@b.c' }))
    const user = userEvent.setup()
    renderMenu('/show/moti')
    await openDropdown(user)
    expect(screen.getByText('Ankit')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(localStorage.getItem('peblo_token')).toBeNull()
    expect(localStorage.getItem('peblo_user')).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })
})
