/* Sign Up — matches dreamlink3.0/app/(auth-pages)/sign-up/page.tsx with v2 branding */

function SignUpMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--cream-soft)', overflow: 'hidden' }}>
      <SiteHeader />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px 32px',
        background: 'linear-gradient(165deg, var(--cream-soft) 0%, oklch(0.93 0.025 230) 100%)',
        minHeight: 'calc(100% - 72px)',
      }}>
        <div style={{ width: 480, position: 'relative' }}>
          {/* subtle moon glow behind card */}
          <div style={{
            position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
            width: 360, height: 220, borderRadius: '50%',
            background: 'radial-gradient(ellipse, oklch(0.85 0.06 75 / 0.5) 0%, transparent 60%)',
            zIndex: 0,
          }} />

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 100,
              background: 'oklch(0.95 0.05 75)',
              border: '1px solid oklch(0.85 0.08 75)',
              marginBottom: 22,
            }}>
              <span style={{ color: 'var(--gold-deep)', fontSize: 12 }}>✦</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '0.02em' }}>
                Start Your Free Trial
              </span>
            </div>
            <h1 className="font-serif" style={{
              fontSize: 40, lineHeight: 1.1, color: 'var(--warm-darker)',
              fontWeight: 400, marginBottom: 10,
            }}>
              Join <span className="wordmark" style={{ color: 'var(--gold-deep)', fontStyle: 'italic' }}>DreamRiver</span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--warm-muted)' }}>
              Begin your spiritual dream interpretation journey
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'white',
            border: '1px solid var(--warm-line)',
            borderRadius: 18,
            padding: 36,
            boxShadow: '0 16px 48px oklch(0.18 0.02 250 / 0.08), 0 2px 8px oklch(0.18 0.02 250 / 0.04)',
            position: 'relative',
          }}>
            {/* Mark at top of card */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <AppIcon size={56} radius={22}>
                <MoonwaterMark size={36} />
              </AppIcon>
              <div className="font-serif" style={{ fontSize: 22, color: 'var(--warm-darker)', marginTop: 14 }}>
                Start Your Free Trial
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--warm-muted)', marginTop: 4 }}>
                7 days free · No credit card required · Cancel anytime
              </div>
            </div>

            {/* Google OAuth */}
            <div style={{
              border: '1px solid var(--warm-line)',
              borderRadius: 8, padding: '11px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, fontWeight: 500, color: 'var(--warm-darker)',
              cursor: 'pointer', marginBottom: 18,
              background: 'white',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC04"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--warm-line)' }} />
              <span style={{ fontSize: 10.5, color: 'var(--warm-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                or sign up with email
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--warm-line)' }} />
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--warm-darker)', marginBottom: 6 }}>Email</label>
                <div style={{
                  padding: '10px 14px',
                  border: '1px solid var(--warm-line)',
                  borderRadius: 8,
                  fontSize: 14, color: 'var(--warm-muted)',
                  background: 'white',
                }}>you@example.com</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--warm-darker)', marginBottom: 6 }}>Password</label>
                <div style={{
                  padding: '10px 14px',
                  border: '1px solid var(--gold)',
                  outline: '3px solid oklch(0.72 0.14 75 / 0.18)',
                  borderRadius: 8,
                  fontSize: 14, color: 'var(--warm-darker)',
                  background: 'white',
                }}>••••••••••</div>
              </div>

              <GoldButton size="lg" style={{ width: '100%', justifyContent: 'center', padding: '13px 22px' }}>
                Sign up
              </GoldButton>

              <p style={{ fontSize: 11.5, color: 'var(--warm-muted)', lineHeight: 1.55 }}>
                Password must be at least 8 characters with an uppercase letter, lowercase letter, and number or special character.
              </p>
            </div>

            <div style={{
              borderTop: '1px solid var(--warm-line)',
              paddingTop: 18, marginTop: 22, textAlign: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--warm-muted)' }}>
                Already have an account? <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>Sign in</span>
              </span>
            </div>
          </div>

          {/* Benefits card */}
          <div style={{
            background: 'oklch(0.96 0.04 75)',
            border: '1px solid oklch(0.85 0.08 75)',
            borderRadius: 14, padding: 22,
            marginTop: 18,
          }}>
            <div className="font-serif" style={{ fontSize: 16, color: 'var(--warm-darker)', textAlign: 'center', marginBottom: 14 }}>
              What you'll get:
            </div>
            <div style={{ display: 'grid', gap: 9 }}>
              {[
                'AI-powered dream interpretations',
                'Biblical references and insights',
                'Private dream journal',
                'Pattern tracking and insights',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--success)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, flexShrink: 0,
                  }}>✓</span>
                  <span style={{ fontSize: 13.5, color: 'var(--warm-darker)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: 'var(--warm-muted)' }}>← Back to homepage</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SignUpMockup });
