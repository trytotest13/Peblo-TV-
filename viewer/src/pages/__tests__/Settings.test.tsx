/**
 * Viewer Settings page tests — preference persistence and local data controls.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Settings from '../Settings'

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  )
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists the preferred audio language', async () => {
    const user = userEvent.setup()
    const first = renderSettings()

    const hindi = screen.getByRole('radio', { name: /हिंदी/i })
    await user.click(hindi)

    expect(localStorage.getItem('peblo_pref_lang')).toBe('hi')
    expect(hindi).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/हिंदी/)

    // A fresh render picks the stored preference back up.
    first.unmount()
    renderSettings()
    expect(screen.getByRole('radio', { name: /हिंदी/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /^auto$/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('clears locally saved shows after confirmation', async () => {
    localStorage.setItem('peblo-list:moti', 'true')
    localStorage.setItem('peblo-list:bheem', 'false')
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('button', { name: /clear my list on this device/i }))
    await user.click(screen.getByRole('button', { name: /yes, remove them/i }))

    expect(screen.getByRole('status')).toHaveTextContent(/removed 1 saved show/i)
    expect(localStorage.getItem('peblo-list:moti')).toBeNull()
    expect(localStorage.getItem('peblo-list:bheem')).toBeNull()
  })

  it('disables clearing when nothing is saved on the device', () => {
    renderSettings()
    expect(screen.getByRole('button', { name: /clear my list on this device/i })).toBeDisabled()
  })
})
