import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import defaultTables from '../data/tables.json';

// Google Business Reviews Profile Link (replaceable with your exact Google Place URL)
const GOOGLE_REVIEWS_URL = 'https://search.google.com/local/writereview?placeid=ChIJo7X82q60EDkRlXQ77yJ7Zp4';

function App() {
  const [tables, setTables] = useState(defaultTables);
  const [instagramFeed, setInstagramFeed] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Expandable Menu Drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Hamburger Sidebar state
  const [culinaryVisible, setCulinaryVisible] = useState(false); // Zoom reveal state

  // Eatery Menu Items (Mountain Tavern Culinary in Rupees)
  const menuItems = [
    { id: 'm1', name: 'Wild Mushroom Risotto', desc: 'Arborio rice, locally foraged mountain chanterelles, porcini broth, aged parmesan, truffle oil.', price: 650 },
    { id: 'm2', name: 'Alpine Roasted Lamb', desc: 'Slow-cooked mountain lamb chops, pine needle marinade, charred root vegetables, rosemary jus.', price: 1200 },
    { id: 'm3', name: 'Charcoal Grilled River Trout', desc: 'Fresh mountain stream trout, lemon-herb butter, watercress, roasted fingerling potatoes.', price: 850 },
    { id: 'm4', name: 'Mountain Berry Cobbler', desc: 'Wild blackberries, blueberries, warm spiced crumble, homemade honey-vanilla bean gelato.', price: 350 },
    { id: 'm5', name: 'Spiced Alpine Mulled Wine', desc: 'Warm red wine infused with local mountain herbs, orange peel, cinnamon, and mountain cloves.', price: 450 }
  ];

  const [cart, setCart] = useState({});
  const [tableDesignation, setTableDesignation] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  const zonesSectionRef = useRef(null);
  const gallerySectionRef = useRef(null);
  const culinarySectionRef = useRef(null); // Ref for Zoom Reveal
  const visitSectionRef = useRef(null);

  // Fetch Seating Zones, Instagram Feed & Initialize Lenis Smooth Scroll
  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);
      })
      .catch(err => console.error("Error fetching tables:", err));

    fetch('/api/instagram')
      .then(res => res.json())
      .then(data => {
        setInstagramFeed(data);
      })
      .catch(err => console.error("Error fetching instagram feed:", err));

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium easing
      smoothWheel: true,
      wheelMultiplier: 1.0
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Set up Intersection Observer for Zoom Reveal Section
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCulinaryVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (culinarySectionRef.current) {
      observer.observe(culinarySectionRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  // Cart quantity controls
  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => {
      const updated = { ...prev };
      if (!updated[id]) return prev;
      const newQty = updated[id].quantity + delta;
      if (newQty <= 0) {
        delete updated[id];
      } else {
        updated[id].quantity = newQty;
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Submit Dining Order
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!tableDesignation) {
      alert("Please specify your Table Number or Dining Zone.");
      return;
    }
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      alert("Your order cart is empty.");
      return;
    }

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableDesignation,
          items: cartItems,
          totalAmount: getCartTotal(),
          specialInstructions
        })
      });
      const result = await response.json();
      if (response.ok) {
        setOrderSuccess(true);
        
        // Speak voice simulation using browser Web Speech API
        const itemNames = cartItems.map(i => `${i.quantity} ${i.name}`).join(', ');
        speakSimulatedCall(`Attention. A new culinary order has been placed by Table ${tableDesignation} for ${itemNames}. Total amount is ${getCartTotal()} rupees.`);
        
        setTimeout(() => setOrderSuccess(false), 8000);
        setCart({});
        setSpecialInstructions('');
      } else {
        alert(result.error || "Order failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending order.");
    }
  };

  // Simulated Telephone Voice Call using Browser Speech Synthesis
  const speakSimulatedCall = (text) => {
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Premium pacing
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }, 1000);
    }
  };



  // Mountain & Scenic Gallery URLs (updated stable URLs, non-repeating with seating zones)
  const scenicImages = [
    { url: '/l1.jpg', title: 'Grand Kufri Alpine Ranges' },
    { url: '/l5.jpg', title: 'Alpine Pine Woodland' },
    { url: '/l6.jpg', title: 'High Summit Fog' }
  ];

  // Customer Reviews Data
  const customerReviews = [
    { name: 'Evelyn V.', role: 'Culinary Journalist', review: 'An absolute masterpiece. Eating the wild mushroom risotto while looking out at the snow-covered peaks of Kufri is a sensory experience I will never forget. True quiet luxury.', rating: 5 },
    { name: 'Dr. Marcus Thorne', role: 'Adventure Enthusiast', review: 'Dining in the private Glass Dome during sunset was breathtaking. The attention to detail is pristine—the food was cooked to woodfire perfection. A gem in Kufri.', rating: 5 },
    { name: 'Clara & Sean', role: 'Travel Curators', review: 'The service is exceptionally warm. The notification triggers are incredibly efficient, ensuring our dishes arrived hot. A premium sanctuary.', rating: 5 }
  ];

  return (
    <div>
      {/* Navigation (Cleaned & Less Crowded) */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="brand">
          <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>The Fusion Lab</a>
        </div>
        <ul className="nav-links">
          <li><a href="#about">Concept</a></li>
          <li><a href="#dining-zones">Zones</a></li>
          <li><a href="#gallery">Galleries</a></li>
          <li><a href="#visit">Visit Us</a></li>
        </ul>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a href="tel:9988502602" className="nav-phone-link" aria-label="Call Us" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', color: 'var(--accent)', transition: 'all 0.3s ease' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </a>
          <button className="btn-book-nav" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }} onClick={() => setMenuOpen(true)}>
            Explore Menu
          </button>
          
          {/* Mobile Hamburger Toggle (3 Generic lines) */}
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Toggle Navigation Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1920')` }}>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover'
            }}
          >
            <source src="/background.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-content">
          <span className="hero-subtitle">High-Altitude Culinary Sanctuary • Kufri</span>
          <h1 className="hero-title">The Fusion Lab</h1>
          <p className="hero-description">
            Experience authentic high-altitude gastronomy. Nestled in the peaks of Kufri, Himachal Pradesh, combining slow-cooked alpine recipes, fireplace warmth, and breathtaking mountain views.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => setMenuOpen(true)}>
              Explore Menu
            </button>
            <button className="btn-primary" style={{ background: 'transparent', borderColor: 'var(--bg-primary)' }} onClick={() => visitSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Visit Us
            </button>
          </div>
        </div>
      </section>

      {/* 1. The Story Section */}
      <section className="section" id="about">
        <div className="story-grid">
          <div className="story-visuals">
            <img src="/IMG_6147.jpg" alt="Mountain Restaurant Kitchen" className="story-img-main" />
            <img src="/p5food.jpg" alt="Plated Dish" className="story-img-sub" />
          </div>
          <div className="story-content">
            <span className="section-subtitle">Our Mountain Eatery</span>
            <h2 className="section-title">Rooted in Earth, Foraged from the Peaks</h2>
            <div className="story-divider"></div>
            <p>
              The Fusion Lab represents the essence of high-altitude mountain dining in Kufri. Set amidst towering pines and misty ranges, our kitchen celebrates the ingredients of the forest, the stream, and the local alpine farms.
            </p>
            <p>
              Under the direction of our culinary curators, every dish is slow-cooked using traditional woodfire techniques. We offer tables nestled next to our indoor stone hearths, or inside premium heated glass domes on the open terrace for starlit dining.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Dining Seating Zones Showcase */}
      <section className="section section-bg-alt" id="dining-zones" ref={zonesSectionRef}>
        <div className="section-header">
          <span className="section-subtitle">Cafe Lounges</span>
          <h2 className="section-title">Our Seating Corners</h2>
          <p>Relax and unwind in our distinct cafe seating spaces—each curated to evoke warmth, comfort, and premium alpine character on a walk-in basis.</p>
        </div>
        <div className="lounge-showcase">
          {tables.map(table => (
            <div key={table.id} className="lounge-row">
              <div className="lounge-image-col">
                <div className="lounge-image-wrapper">
                  <img src={table.image} alt={table.name} />
                </div>
              </div>
              <div className="lounge-content-col">
                <span className="lounge-vibe">{table.vibe}</span>
                <h3 className="lounge-title">{table.name}</h3>
                <p className="lounge-description">{table.description}</p>
                <div className="lounge-amenities">
                  {table.experience.map((exp, idx) => (
                    <span key={idx} className="lounge-tag">{exp}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Horizontal Smooth Marquee Galleries Section (Right to Left Scrolling) */}
      <section className="section" id="gallery" ref={gallerySectionRef}>
        <div className="section-header">
          <span className="section-subtitle">Visual Experience</span>
          <h2 className="section-title">Scenic Views & Culinary Art</h2>
          <p>Explore the stunning surroundings and culinary creations that make dining at The Fusion Lab a premium retreat.</p>
        </div>

        {/* Scenic Gallery - Smooth Infinite Marquee */}
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', textAlign: 'center', marginBottom: '30px', color: 'var(--text-primary)' }}>
          Mountain sceneries & Scenic Views
        </h3>
        <div className="marquee-container" style={{ marginBottom: '80px' }}>
          <div className="marquee-content" style={{ animationDuration: '40s' }}>
            {scenicImages.map((img, idx) => (
              <div key={`scenic-1-${idx}`} className="marquee-item-gallery hover-scale">
                <div className="room-image-wrapper" style={{ height: '300px', borderRadius: '8px', boxShadow: 'var(--shadow-floating)' }}>
                  <img src={img.url} alt={img.title} />
                </div>
                <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  {img.title}
                </p>
              </div>
            ))}
            {scenicImages.map((img, idx) => (
              <div key={`scenic-2-${idx}`} className="marquee-item-gallery hover-scale">
                <div className="room-image-wrapper" style={{ height: '300px', borderRadius: '8px', boxShadow: 'var(--shadow-floating)' }}>
                  <img src={img.url} alt={img.title} />
                </div>
                <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  {img.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Gastronomy Gallery - Scroll-driven Zoom Reveal & Instagram Feed */}
        <div ref={culinarySectionRef} className={`zoom-reveal-section ${culinaryVisible ? 'visible' : ''}`} style={{ marginTop: '50px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', textAlign: 'center', marginBottom: '10px', color: 'var(--text-primary)' }}>
            Alpine Culinary & Food Plates
          </h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '30px' }}>
            Upload your moments at The Fusion Lab, tag us <a href="https://instagram.com/thefusionlab__" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>@thefusionlab__</a>, and get featured on our website!
          </p>
          
          {/* Instagram Post Feed Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '90%', margin: '0 auto', padding: '0' }}>
            {instagramFeed.map(post => (
              <a 
                key={post.id} 
                href={post.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="instagram-card hover-lift"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '4px', 
                  overflow: 'hidden', 
                  textDecoration: 'none', 
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
              >
                {/* Post Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                    FL
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>thefusionlab__</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Kufri, Shimla</span>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </span>
                </div>
                
                {/* Post Image with Hover Overlay */}
                <div className="room-image-wrapper" style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                  <img src={post.imageUrl} alt={post.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="instagram-overlay" style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, width: '100%', height: '100%', 
                    background: 'rgba(0,0,0,0.5)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', 
                    color: '#fff', opacity: 0, transition: 'opacity 0.3s ease',
                    fontWeight: 'bold', fontSize: '16px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      ❤️ {post.likes}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      💬 {post.comments}
                    </span>
                  </div>
                </div>
                
                {/* Post Caption */}
                <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.5', margin: 0, color: 'var(--text-primary)', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    <strong>thefusionlab__</strong> {post.caption}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                    {new Date(post.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>


      {/* 5. Horizontal Smooth Rotating Reviews Section (Right to Left Scrolling) */}
      <section className="section" id="reviews">
        <div className="section-header">
          <span className="section-subtitle">Testimonials</span>
          <h2 className="section-title">Verified Cafe Guest Reviews</h2>
          <p>What our guests say about their high-altitude gastronomic journey.</p>
        </div>
        
        <div className="marquee-container">
          <div className="marquee-content" style={{ animationDuration: '35s' }}>
            {customerReviews.map((rev, index) => (
              <div key={`rev-1-${index}`} className="marquee-item-review review-card-floating">
                <div style={{ color: 'var(--accent)', fontSize: '18px', marginBottom: '15px' }}>
                  {'★'.repeat(rev.rating)}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '20px', lineHeight: '1.7' }}>
                  "{rev.review}"
                </p>
                <div>
                  <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>{rev.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{rev.role}</span>
                </div>
              </div>
            ))}
            {customerReviews.map((rev, index) => (
              <div key={`rev-2-${index}`} className="marquee-item-review review-card-floating">
                <div style={{ color: 'var(--accent)', fontSize: '18px', marginBottom: '15px' }}>
                  {'★'.repeat(rev.rating)}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '20px', lineHeight: '1.7' }}>
                  "{rev.review}"
                </p>
                <div>
                  <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>{rev.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{rev.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a 
            href={GOOGLE_REVIEWS_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '12px 30px', 
              fontSize: '11px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              borderColor: 'var(--text-primary)',
              background: 'transparent',
              color: 'var(--text-primary)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.83z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.49l4.11-3.25z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 5.49l4.11 3.25c.94-2.85 3.57-4.99 6.68-4.99z"/>
            </svg>
            Read & Write Reviews on Google
          </a>
        </div>
      </section>

      {/* 6. Location Map Section */}
      <section className="map-section">
        <div className="section-header" style={{ marginBottom: '45px' }}>
          <span className="section-subtitle">Interactive Map</span>
          <h2 className="section-title">Location Highlight</h2>
          <p>The Fusion Lab Kufri, Shimla, Himachal Pradesh.</p>
        </div>
        <div className="map-container-wrapper">
          <iframe 
            src="https://maps.google.com/maps?q=Kufri,Himachal%20Pradesh,India&t=&z=13&ie=UTF8&iwloc=&output=embed" 
            allowFullScreen="" 
            loading="lazy" 
            title="Google Maps Location of The Fusion Lab Kufri"
          ></iframe>
        </div>
      </section>

      {/* 7. Visit Us Section */}
      <section className="section" id="visit" ref={visitSectionRef}>
        <div className="section-header">
          <span className="section-subtitle">Location & Hours</span>
          <h2 className="section-title">Visit Us in Kufri</h2>
          <p>Reserve ahead to experience fireside luxury dining at altitude.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '50px', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>Tavern Opening Hours</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <span>Monday – Sunday (Everyday)</span>
              <strong>8:00 AM – 11:00 PM</strong>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>Find The Fusion Lab</h3>
            <p style={{ fontSize: '14px' }}>
              Altitude Marker 14, Peak Enclave Road.<br/>
              Kufri, Shimla, Himachal Pradesh, India.
            </p>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--accent)' }}>
              Coordinates: 31°06'02.9"N 77°15'58.2"E
            </p>
            <a href="mailto:thefusionlab11@gmail.com" className="btn-primary" style={{ textAlign: 'center', display: 'block' }}>
              Get Directions Email
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col" style={{ gridColumn: 'span 2' }}>
            <div className="brand-logo" style={{ color: 'var(--accent)', fontSize: '32px' }}>The Fusion Lab</div>
            <p style={{ color: 'rgba(250, 251, 249, 0.6)', maxWidth: '350px', marginTop: '10px' }}>
              Alpine dining, stone fireplace atmosphere, and slow mountain hospitality.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <ul className="footer-links">
              <li><a href="#about">The Concept</a></li>
              <li><a href="#dining-zones">Dining Areas</a></li>
              <li><a href="#gallery">Gallery</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact Details</h4>
            <ul className="footer-links" style={{ color: 'rgba(250, 251, 249, 0.6)', fontSize: '13px' }}>
              <li>Altitude Marker 14, Peak Enclave Road, Kufri</li>
              <li><strong>Email:</strong> <a href="mailto:thefusionlab11@gmail.com">thefusionlab11@gmail.com</a></li>
              <li><strong>Call:</strong> <a href="tel:9988502602">9988502602</a></li>
              <li style={{ marginTop: '10px' }}>
                <a 
                  href="https://instagram.com/thefusionlab__" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>@thefusionlab__</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 The Fusion Lab Kufri. All rights reserved.</p>
          <p style={{ letterSpacing: '0.05em' }}>IMPECCABLE ALPINE DESIGN</p>
        </div>
      </footer>

      {/* Mobile Navigation Drawer Sidebar Panel */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-drawer-header">
            <div className="brand-logo" style={{ fontSize: '22px' }}>The Fusion Lab</div>
            <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>×</button>
          </div>
          <div className="mobile-drawer-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ul className="mobile-nav-links">
              <li><a href="#about" onClick={() => setMobileMenuOpen(false)}>Concept</a></li>
              <li><a href="#dining-zones" onClick={() => setMobileMenuOpen(false)}>Zones</a></li>
              <li><a href="#gallery" onClick={() => setMobileMenuOpen(false)}>Galleries</a></li>
              <li><a href="#visit" onClick={() => setMobileMenuOpen(false)}>Visit Us</a></li>
            </ul>
            <div style={{ marginTop: 'auto', paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMenuOpen(true);
                }}
              >
                Explore Menu
              </button>
              <a 
                href="tel:9988502602"
                className="btn-primary" 
                style={{ 
                  width: '100%', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  background: 'transparent', 
                  borderColor: 'var(--text-primary)', 
                  color: 'var(--text-primary)', 
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Call Tavern</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Menu Slide-out Drawer Panel (Emil Kowalski Transitions) */}
      <div className={`menu-drawer-overlay ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
        <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="menu-drawer-header">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px' }}>The Culinary Menu</h2>
            <button className="menu-drawer-close" onClick={() => setMenuOpen(false)}>×</button>
          </div>
          <div className="menu-drawer-body">
            <p style={{ marginBottom: '30px', color: 'var(--text-secondary)' }}>
              Select items from our mountain kitchen. Orders trigger an SMS and voice call alert to our chefs.
            </p>
            <div className="room-service-container">
              {/* Menu Items List */}
              <div className="menu-list">
                {menuItems.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-details">
                      <div className="menu-item-header">
                        <span className="menu-item-name">{item.name}</span>
                        <span className="menu-item-price">₹{item.price}</span>
                      </div>
                      <p className="menu-item-desc">{item.desc}</p>
                    </div>
                    <button className="btn-add-item" onClick={() => addToCart(item)}>+</button>
                  </div>
                ))}
              </div>

              {/* Order Cart */}
              <div className="cart-panel" style={{ position: 'relative', top: 'auto' }}>
                <h3 className="cart-title">Your Order Basket</h3>
                {orderSuccess ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--accent)' }}>
                    <p style={{ fontWeight: '500', marginBottom: '8px' }}>🛎️ Sent to Kitchen!</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Admin has been notified via SMS and immediate Phone Call.</p>
                  </div>
                ) : (
                  <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="cart-items-list">
                      {Object.values(cart).length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                          Basket is empty. Select items to add.
                        </p>
                      ) : (
                        Object.values(cart).map(item => (
                          <div key={item.id} className="cart-item-row">
                            <span>{item.name}</span>
                            <div className="cart-item-qty-controls">
                              <button type="button" className="btn-qty" onClick={() => updateCartQty(item.id, -1)}>-</button>
                              <span>{item.quantity}</span>
                              <button type="button" className="btn-qty" onClick={() => updateCartQty(item.id, 1)}>+</button>
                              <span style={{ marginLeft: '10px', color: 'var(--accent)', fontWeight: '500' }}>₹{item.price * item.quantity}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="form-group">
                      <label>Table / Seating Zone *</label>
                      <input 
                        type="text" 
                        placeholder="E.g., Table 3 / Fireside Zone" 
                        value={tableDesignation}
                        onChange={(e) => setTableDesignation(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label>Requests</label>
                      <textarea 
                        rows="2" 
                        placeholder="E.g., Extra hot, no garlic..." 
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                      />
                    </div>

                    <div className="cart-total-row">
                      <span>Total:</span>
                      <span>₹{getCartTotal()}</span>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={Object.keys(cart).length === 0} 
                      style={{ opacity: Object.keys(cart).length === 0 ? 0.5 : 1, width: '100%' }}
                    >
                      Place Dining Order
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
