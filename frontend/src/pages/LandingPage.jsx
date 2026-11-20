import React from 'react';
import {
  Droplets,
  Zap,
  Activity,
  Cpu,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Play,
  Waves,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Gauge,
  Radio,
  Settings,
} from 'lucide-react';

const LandingPage = ({ onNavigate, onOpenAuth, currentUser, onLogout }) => {
  const handleLaunchConsole = () => {
    if (currentUser) {
      onNavigate('dashboard');
    } else {
      if (onOpenAuth) onOpenAuth('signin');
    }
  };

  return (
    <div className="aquabrim-landing-root full-width-layout">
      {/* =========================================================================
          1. TOP NAVIGATION BAR (Full Width, Name: WaterTank Automation)
          ========================================================================= */}
      <header className="aquabrim-navbar">
        <div className="aquabrim-nav-container full-width-container">
          {/* Brand Logo & Name */}
          <div className="aquabrim-brand" onClick={() => onNavigate('landing')}>
            <div className="aquabrim-logo-drop">
              <Droplets size={22} color="#FFFFFF" />
            </div>
            <div className="aquabrim-brand-names">
              <span className="brand-primary">WaterTank Automation</span>
              <span className="brand-sub">Smart IoT Water Level & Pump Control</span>
            </div>
          </div>

          {/* Right Action Button */}
          <div className="aquabrim-nav-actions">
            {currentUser ? (
              <div className="nav-logged-wrap">
                <button
                  type="button"
                  className="aquabrim-btn-outline"
                  onClick={() => onNavigate('dashboard')}
                >
                  <Gauge size={15} />
                  <span>Dashboard Console</span>
                </button>
                <button
                  type="button"
                  className="aquabrim-btn-logout"
                  onClick={onLogout}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="aquabrim-btn-pill"
                onClick={handleLaunchConsole}
              >
                <span>Sign In</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION (Full Width, Solusi Problem Air Anda + Animated Image)
          ========================================================================= */}
      <section className="aquabrim-hero-wrap full-width-wrap" id="hero">
        <div className="aquabrim-hero-container full-width-container">
          <div className="aquabrim-hero-card hero-split-grid">
            {/* Background Water Ripple Photography Overlay */}
            <div className="hero-water-bg"></div>

            {/* Left Content Column */}
            <div className="hero-content-box">
              <div className="hero-badge-pill">
                <span className="pulse-beacon"></span>
                <span>SMART WATER AUTOMATION SYSTEM</span>
              </div>

              <h1 className="hero-main-title">
                Solusi Problem <br />
                Air Anda
              </h1>

              <p className="hero-description">
                Sistem kontrol air otomatis cerdas dengan deteksi ultrasonik dan sensor aliran. Bebas tumpah, hemat listrik, dan menjaga pasokan air hunian serta industri Anda selalu aman 24/7.
              </p>

              {/* Inset Stats */}
              <div className="hero-stats-inset">
                <div className="hero-stat-item">
                  <span className="stat-num">100%</span>
                  <span className="stat-lbl">Otomasi Total</span>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat-item">
                  <span className="stat-num">24/7</span>
                  <span className="stat-lbl">Real-Time IoT</span>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat-item">
                  <span className="stat-num">0%</span>
                  <span className="stat-lbl">Risiko Tumpah</span>
                </div>
              </div>
            </div>

            {/* Right Column: Animated Water Tank Image / Simulation */}
            <div className="hero-animated-visual-col">
              <div className="animated-tank-card">
                <div className="tank-visual-cylinder">
                  <div className="tank-height-scale">
                    <div className="scale-mark mark-100"><span>100%</span></div>
                    <div className="scale-mark mark-75"><span>75%</span></div>
                    <div className="scale-mark mark-50"><span>50%</span></div>
                    <div className="scale-mark mark-25"><span>25%</span></div>
                  </div>

                  {/* Animated Liquid Water Container */}
                  <div className="tank-water-fluid">
                    {/* Continuous SVG Waves */}
                    <div className="liquid-wave-layer">
                      <svg
                        className="animated-wave-svg wave-back"
                        viewBox="0 0 800 120"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M 0,20 C 150,60 300,0 450,30 C 600,60 750,10 800,25 L 800,120 L 0,120 Z"
                          fill="rgba(56, 189, 248, 0.65)"
                        />
                      </svg>
                      <svg
                        className="animated-wave-svg wave-front"
                        viewBox="0 0 800 120"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M 0,35 C 180,5 340,55 500,20 C 660,-10 750,45 800,30 L 800,120 L 0,120 Z"
                          fill="#0284C7"
                        />
                      </svg>
                    </div>

                    {/* Rising Animated Bubbles */}
                    <div className="fluid-bubble bub-1"></div>
                    <div className="fluid-bubble bub-2"></div>
                    <div className="fluid-bubble bub-3"></div>
                    <div className="fluid-bubble bub-4"></div>
                  </div>
                </div>

                {/* Bottom Pump Unit & Flow Stream */}
                <div className="animated-pump-rig">
                  <div className="pump-motor-widget">
                    <div className="pump-rotor-icon">
                      <Settings size={20} className="spinning-gear" />
                    </div>
                    <div className="pump-motor-info">
                      <span className="motor-label">MOTOR PUMP</span>
                    </div>
                  </div>

                  <div className="pipe-flow-visual">
                    <div className="flow-dash flow-1"></div>
                    <div className="flow-dash flow-2"></div>
                    <div className="flow-dash flow-3"></div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. 6-STEP AUTOMATION PROCESS (Full Width, Reduced Gaps)
          ========================================================================= */}
      <section className="aquabrim-process-section full-width-wrap" id="workflow">
        <div className="section-title-center">
          <span className="badge-tag-blue">AUTOMATION PIPELINE</span>
          <h2>Smart Water Level Control</h2>
          <p className="subtitle-lead">Fully Automatic. Always Reliable.</p>
        </div>

        <div className="workflow-grid-container full-width-container">
          {/* Step 1 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">1</div>
            <div className="step-icon-wrap">
              <Droplets size={24} className="text-blue" />
            </div>
            <h4>Water Available</h4>
            <p>Checks incoming water supply (Municipal or Borewell).</p>
          </div>

          <div className="workflow-step-arrow">➔</div>

          {/* Step 2 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">2</div>
            <div className="step-icon-wrap">
              <Waves size={24} className="text-amber" />
            </div>
            <h4>Level Low</h4>
            <p>When tank level drops below the set point (e.g. 25%)...</p>
          </div>

          <div className="workflow-step-arrow">➔</div>

          {/* Step 3 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">3</div>
            <div className="step-icon-wrap">
              <Play size={24} className="text-emerald" />
            </div>
            <h4>Motor ON</h4>
            <p>Turns the motor ON to fill the tank automatically.</p>
          </div>

          <div className="workflow-step-arrow">➔</div>

          {/* Step 4 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">4</div>
            <div className="step-icon-wrap">
              <Activity size={24} className="text-cyan" />
            </div>
            <h4>Tank Filling</h4>
            <p>Continuously monitors level and liters in real time.</p>
          </div>

          <div className="workflow-step-arrow">➔</div>

          {/* Step 5 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">5</div>
            <div className="step-icon-wrap">
              <CheckCircle2 size={24} className="text-blue" />
            </div>
            <h4>Tank Full</h4>
            <p>When tank reaches set capacity, motor turns OFF automatically.</p>
          </div>

          <div className="workflow-step-arrow">➔</div>

          {/* Step 6 */}
          <div className="workflow-step-card">
            <div className="step-badge-number">6</div>
            <div className="step-icon-wrap">
              <ShieldAlert size={24} className="text-rose" />
            </div>
            <h4>No Water</h4>
            <p>If water is not available in supply line, motor remains OFF.</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. HARDWARE & 7 FEATURES SHOWCASE + 4 PROTECTION PILLARS (Full Width)
          ========================================================================= */}
      <section className="aquabrim-hardware-section full-width-wrap" id="architecture">
        <div className="hardware-section-inner full-width-container">
          {/* Left Column: 7 Features Checklist */}
          <div className="hardware-checklist-col">
            <div className="checklist-header">
              <span className="badge-tag-blue">FITUR UNGGULAN</span>
              <h3>Proteksi Lengkap & Otomasi Total</h3>
              <p>
                Sistem WaterTank Automation menggabungkan pembacaan sensor kedalaman tangki dan sensor saluran pipa masukan.
              </p>
            </div>

            <div className="aquabrim-feature-pills-list">
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Detects water supply availability</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Monitors tank water level</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Starts motor when level is low</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Stops motor when tank is full</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Prevents dry-run damage</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Avoids overflow and wastage</span>
              </div>
              <div className="feature-check-pill">
                <CheckCircle2 size={18} className="pill-check-icon" />
                <span>Maintains Consistent Water Supply</span>
              </div>
            </div>

            <div className="checklist-cta-box">
              <button
                type="button"
                className="btn-pill-blue"
                onClick={handleLaunchConsole}
              >
                <span>Buka Dashboard Controller</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right Column: Visual Diagram Image */}
          <div className="hardware-diagram-col">
            <div className="diagram-frame-card">
              <div className="diagram-header-badge">
                <span className="dot-live"></span>
                <span>AUTOMATIC CONTROLLER & INDICATOR</span>
              </div>
              <img
                src="/images/aquabrim-control-diagram.png"
                alt="Smart Water Level Control Diagram"
                className="aquabrim-diagram-img"
              />
            </div>
          </div>
        </div>

        {/* 4 Protection Pillars */}
        <div className="four-pillars-grid full-width-container">
          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Droplets size={24} color="#0062E0" />
            </div>
            <div className="pillar-content">
              <h4>Overflow Protection</h4>
              <p>Mencegah air tumpah dan membuang air sia-sia dengan mematikan pompa sebelum mencapai batas bibir tangki.</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <ShieldCheck size={24} color="#0062E0" />
            </div>
            <div className="pillar-content">
              <h4>Dry Run Protection</h4>
              <p>Melindungi motor pompa agar tidak terbakar saat pasokan air PAM atau sumur bor sedang kosong.</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Zap size={24} color="#0062E0" />
            </div>
            <div className="pillar-content">
              <h4>Auto Pump Control</h4>
              <p>Menyalakan dan mematikan pompa otomatis sesuai batas ketinggian air yang telah diprogram.</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Activity size={24} color="#0062E0" />
            </div>
            <div className="pillar-content">
              <h4>Continuous Monitoring</h4>
              <p>Pemantauan telemetri ketinggian air, arus listrik, dan daya motor 24 jam nonstop secara real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. MULTI-TANK AUTOMATION SECTION (Full Width)
          ========================================================================= */}
      <section className="aquabrim-multitank-section full-width-wrap" id="multi-tank">
        <div className="multitank-inner full-width-container">
          <div className="multitank-photo-col">
            <div className="photo-frame-shadow">
              <img
                src="/images/multiple-tanks-aquabrim.jpg"
                alt="How to Manage Multiple Water Tanks Automatically - Rooftop Setup"
                className="multitank-img"
              />
              <div className="photo-floating-pill">
                <Radio size={16} className="text-blue" />
                <span>Wireless RF/WiFi Node Mesh</span>
              </div>
            </div>
          </div>

          <div className="multitank-text-col">
            <span className="badge-tag-blue">ENTERPRISE SCALABILITY</span>
            <h2 className="multitank-heading">
              How to Manage Multiple Water Tanks Automatically
            </h2>
            <p className="lead-text">
              Kelola dan sinkronkan pengisian banyak tangki air di atap gedung, perumahan, rumah sakit, dan pabrik industri dengan sistem M Matrix Controller terpusat.
            </p>

            <div className="multitank-benefits">
              <div className="benefit-item">
                <div className="benefit-dot"></div>
                <div>
                  <strong>Kontroler Terpusat M Matrix:</strong> Mengatur pengisian tangki 1, tangki 2, tangki 3, dan tangki 4 secara bergiliran atau serentak sesuai prioritas kapasitas.
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-dot"></div>
                <div>
                  <strong>Komunikasi Nirkabel:</strong> Sensor nirkabel mengirimkan data level air dari setiap tangki tanpa perlu instalasi kabel panjang yang rumit.
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-dot"></div>
                <div>
                  <strong>Beban Pompa Seimbang:</strong> Mencegah motor pompa kelebihan beban (overload) dengan pembagian jadwal pengisian cerdas.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-pill-blue"
              onClick={handleLaunchConsole}
            >
              <span>Kelola Multi-Tank di Dashboard</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FOOTER (Clean, Full Width, Name: WaterTank Automation)
          ========================================================================= */}
      <footer className="aquabrim-footer">
        <div className="footer-container full-width-container">
          <div className="footer-col-main">
            <div className="footer-brand">
              <div className="aquabrim-logo-drop small">
                <Droplets size={18} color="#FFFFFF" />
              </div>
              <span className="brand-primary-white">WaterTank Automation</span>
            </div>
            <p className="footer-legal">
              WaterTank Automation — Solusi Kontrol Air dan Pengisian Tangki Cerdas Berbasis IoT & Otomasi Industri.
            </p>
          </div>

          <div className="footer-col">
            <h5>Navigation</h5>
            <ul>
              <li><a href="#workflow">How It Works</a></li>
              <li><a href="#architecture">Protection Features</a></li>
              <li><a href="#multi-tank">Multi-Tank</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Services</h5>
            <ul>
              <li><span>Building Multi-Tank System</span></li>
              <li><span>Dry-Run Pump Protection</span></li>
              <li><span>Electrical Telemetry Audit</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Contact Us</h5>
            <ul className="footer-contact-list">
              <li><Phone size={14} /> +62 21 8899 7766</li>
              <li><Mail size={14} /> support@watertank.local</li>
              <li><MapPin size={14} /> Jakarta, Indonesia</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar full-width-container">
          <p>© 2026 WaterTank Automation System. All Rights Reserved.</p>
          <div className="footer-bottom-links">
            <span onClick={handleLaunchConsole}>Dashboard Console</span>
            <span>Kebijakan Privasi</span>
            <span>Syarat & Ketentuan</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;