import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <div className="container">
        <div className="landing-nav">
          <span className="wordmark">Board</span>
          <Link href="/login" className="btn btn-outline">
            Sign in
          </Link>
        </div>

        <div className="landing-hero">
          <h1 className="landing-headline">Your menu, up in minutes.</h1>
          <p className="landing-sub">
            Sign in with Google, add your dishes and prices, and share one link.
            Customers see it instantly — no app, no login, no printing.
          </p>
          <Link href="/login" className="btn btn-primary">
            Continue with Google
          </Link>
        </div>

        <div className="landing-preview-wrap">
          <div className="landing-preview">
            <div className="board-page is-preview">
              <div className="board-frame">
                <p className="board-title" style={{ fontSize: 22, marginBottom: 20 }}>
                  Corner Cafe
                </p>
                <div className="board-category" style={{ marginBottom: 4 }}>
                  <p className="board-category-name" style={{ fontSize: 22 }}>
                    Mornings
                  </p>
                  <hr className="board-category-rule" style={{ margin: '6px 0 10px' }} />
                  <div className="menu-row" style={{ padding: '8px 0' }}>
                    <div className="menu-row-body">
                      <div className="menu-row-head">
                        <span className="menu-row-name" style={{ fontSize: 14 }}>
                          Flat white
                        </span>
                        <span className="menu-row-leader" />
                        <span className="menu-row-price" style={{ fontSize: 14 }}>
                          ₹4.00
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="menu-row" style={{ padding: '8px 0' }}>
                    <div className="menu-row-body">
                      <div className="menu-row-head">
                        <span className="menu-row-name" style={{ fontSize: 14 }}>
                          Almond croissant
                        </span>
                        <span className="menu-row-leader" />
                        <span className="menu-row-price" style={{ fontSize: 14 }}>
                          ₹5.50
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-features">
          <div className="landing-feature">
            <h3>Sign in, not sign up</h3>
            <p>One Google click and you have an account and a public menu link — no forms to fill in first.</p>
          </div>
          <div className="landing-feature">
            <h3>Photos included</h3>
            <p>Drop a photo on any dish and it uploads and resizes automatically, ready to show on any phone.</p>
          </div>
          <div className="landing-feature">
            <h3>One link to share</h3>
            <p>Print it as a QR code for the table, or paste it anywhere — customers never need to log in.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
