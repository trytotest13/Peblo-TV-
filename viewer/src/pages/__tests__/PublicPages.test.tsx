import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import About from '../About'
import Terms from '../Terms'
import Privacy from '../Privacy'
import Cookies from '../Cookies'
import Help from '../Help'

describe('Public & Legal Pages', () => {
  it('renders About page', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /About Peblo TV/i })).toBeInTheDocument()
  })

  it('renders Terms of Service page', () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument()
  })

  it('renders Privacy Policy page', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument()
  })

  it('renders Cookie Policy page', () => {
    render(
      <MemoryRouter>
        <Cookies />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /Cookie & Local Storage Policy/i })
    ).toBeInTheDocument()
  })

  it('renders Help & FAQ page', () => {
    render(
      <MemoryRouter>
        <Help />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /Help & Frequently Asked Questions/i })
    ).toBeInTheDocument()
  })

  it.each([
    ['privacy', Privacy],
    ['terms', Terms],
    ['help', Help],
  ] as const)(
    'renders neutral contact text (no placeholder email) on %s when SUPPORT_EMAIL is unset',
    (_name, Page) => {
      const { unmount } = render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      )
      expect(screen.getByText(/will be published here/i)).toBeInTheDocument()
      expect(document.body.innerHTML).not.toContain('support@mypeblo.com')
      unmount()
    }
  )
})
