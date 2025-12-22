import React, { useEffect } from 'react'

export default function OAuthCallback() {
  useEffect(() => {
    // Expect backend to redirect here with ?token=...&user=... (user JSON encoded)
    const qp = new URLSearchParams(window.location.search)
    const token = qp.get('token')
    const userStr = qp.get('user')
    let user = null
    try {
      if (userStr) user = JSON.parse(decodeURIComponent(userStr))
    } catch (e) {
      // ignore
    }

    if (window.opener) {
      window.opener.postMessage({ token, user }, window.location.origin)
      // give opener a moment then close
      setTimeout(() => {
        try { window.close() } catch (e) {}
      }, 700)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Completing sign in…</h3>
        <p className="text-sm text-muted">If the window does not close automatically, please return to the original tab.</p>
      </div>
    </div>
  )
}
