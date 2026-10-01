'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <span className="wordmark">Board</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage your menu.</p>
        <button onClick={handleGoogleLogin} className="btn btn-primary btn-block">
          Continue with Google
        </button>
      </div>
    </div>
  )
}
