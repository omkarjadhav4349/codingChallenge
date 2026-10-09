import './App.css'

function App() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Omkar Jadhav, home">
          <span className="wordmark-mark">OJ</span>
          <span>Omkar Jadhav</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#interests">What I do</a>
          <a className="nav-contact" href="#contact">Let’s talk <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="intro" id="home" aria-labelledby="intro-title">
        <div className="intro-copy">
          <p className="eyebrow"><span className="status-dot" /> A little introduction</p>
          <h1 id="intro-title">Hey, I’m <span>Omkar.</span><br />I make the web<br />feel a little more <em>human.</em></h1>
          <p className="intro-description">
            I’m a developer learning, building, and bringing thoughtful ideas to life on the web. I enjoy turning a blank page into something useful, clear, and a joy to explore.
          </p>
          <div className="intro-actions">
            <a className="button button-primary" href="#about">Get to know me <span aria-hidden="true">↓</span></a>
            <a className="text-link" href="#contact">Say hello <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div className="intro-art" aria-label="A decorative profile card for Omkar Jadhav" role="img">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="sunburst" aria-hidden="true">✳</div>
          <div className="profile-card">
            <span className="card-label">A WORK IN PROGRESS</span>
            <span className="profile-initials">OJ</span>
            <span className="card-name">Omkar Jadhav</span>
            <span className="card-role">Curious mind · Creative coder</span>
            <span className="card-sparkle" aria-hidden="true">✦</span>
          </div>
          <span className="art-note note-top">made with curiosity</span>
          <span className="art-note note-bottom">always learning ↗</span>
        </div>
      </section>

      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="section-kicker"><span>01</span><span>THE PERSON BEHIND THE PIXELS</span></div>
        <div className="about-content">
          <h2 id="about-title">Good work starts<br />with <span>a little curiosity.</span></h2>
          <div className="about-copy">
            <p>I’m building my path in web development one project at a time. I like learning how things work, experimenting with ideas, and paying attention to the small details that make a digital experience feel right.</p>
            <p>This page is my corner of the internet—a place to share what I’m learning and the things I’m excited to make next.</p>
          </div>
        </div>
      </section>

      <section className="interests-section" id="interests" aria-labelledby="interests-title">
        <div className="section-kicker"><span>02</span><span>THINGS I’M INTO</span></div>
        <h2 id="interests-title">A few things I enjoy <span>working on.</span></h2>
        <div className="interest-grid">
          <article className="interest-card">
            <span className="interest-number">01 / BUILD</span>
            <span className="interest-icon" aria-hidden="true">⌘</span>
            <h3>Thoughtful interfaces</h3>
            <p>Making websites that feel intuitive, welcoming, and easy to use.</p>
          </article>
          <article className="interest-card">
            <span className="interest-number">02 / LEARN</span>
            <span className="interest-icon" aria-hidden="true">↗</span>
            <h3>Growing every day</h3>
            <p>Exploring new tools and getting a little better with every project.</p>
          </article>
          <article className="interest-card">
            <span className="interest-number">03 / CREATE</span>
            <span className="interest-icon" aria-hidden="true">✳</span>
            <h3>Ideas made real</h3>
            <p>Taking a spark of an idea and shaping it into something people can use.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div>
          <p className="footer-kicker">HAVE A GOOD ONE IN MIND?</p>
          <h2>Let’s make<br /><span>something meaningful.</span></h2>
        </div>
        <a className="footer-link" href="mailto:?subject=Hello%20Omkar">Get in touch <span aria-hidden="true">↗</span></a>
        <div className="footer-bottom">
          <a className="wordmark footer-wordmark" href="#home"><span className="wordmark-mark">OJ</span><span>Omkar Jadhav</span></a>
          <span>Made with care and a lot of curiosity.</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>
    </main>
  )
}

export default App
