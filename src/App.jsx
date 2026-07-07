import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import defaultTables from '../data/tables.json';

function App() {
  const [tables, setTables] = useState(defaultTables);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Expandable Menu Drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Hamburger Sidebar state
  const [culinaryVisible, setCulinaryVisible] = useState(false); // Zoom reveal state

  // Reservation Form State
  const [reserveForm, setReserveForm] = useState({
    tableId: defaultTables[0]?.id || '',
    tableName: defaultTables[0]?.name || '',
    guestName: '',
    guestEmail: '',
    date: '',
    time: '19:00',
    guestsCount: '2'
  });
  const [reserveSuccess, setReserveSuccess] = useState(false);

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

  const reservationSectionRef = useRef(null);
  const zonesSectionRef = useRef(null);
  const gallerySectionRef = useRef(null);
  const culinarySectionRef = useRef(null); // Ref for Zoom Reveal
  const visitSectionRef = useRef(null);

  // Fetch Seating Zones & Initialize Lenis Smooth Scroll
  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);
        if (data.length > 0) {
          setReserveForm(prev => ({ ...prev, tableId: data[0].id, tableName: data[0].name }));
        }
      })
      .catch(err => console.error("Error fetching tables:", err));

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

  // Select a seating zone from card
  const selectZoneForBooking = (table) => {
    setReserveForm(prev => ({
      ...prev,
      tableId: table.id,
      tableName: table.name
    }));
    reservationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Reservation Form
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (!reserveForm.guestName || !reserveForm.date || !reserveForm.time) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reserveForm)
      });
      const result = await response.json();
      if (response.ok) {
        setReserveSuccess(true);
        // Speak voice simulation using browser Web Speech API
        speakSimulatedCall(`Attention. A new table reservation has been received at The Fusion Lab. Guest ${reserveForm.guestName} has booked ${reserveForm.tableName} for ${reserveForm.guestsCount} guests.`);
        setTimeout(() => setReserveSuccess(false), 8000);
        // Reset name & email
        setReserveForm(prev => ({ ...prev, guestName: '', guestEmail: '' }));
      } else {
        alert(result.error || "Reservation failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing reservation.");
    }
  };

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

  // Mountain & Scenic Gallery URLs (updated stable URLs, total 6 items)
  const scenicImages = [
    { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800', title: 'Grand Kufri Alpine Ranges' },
    { url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&q=80&w=800', title: 'Snowy Peak Vista' },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800', title: 'Valleys & Mists' },
    { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800', title: 'Valley Sunset Horizon' },
    { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=800', title: 'Alpine Pine Woodland' },
    { url: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&q=80&w=800', title: 'High Summit Fog' }
  ];

  // Food Gallery URLs (total 6 items)
  const foodImages = [
    { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800', title: 'Fireside Wood Oven Roasted Lamb' },
    { url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800', title: 'Wild Porcini Mushroom Risotto' },
    { url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800', title: 'Grilled Mountain Brook Trout' },
    { url: 'https://images.unsplash.com/photo-1560624052-449f5ddf0c31?auto=format&fit=crop&q=80&w=800', title: 'Artisanal Berry Tartlets' },
    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800', title: 'Fireside Warm Hospitality' },
    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800', title: 'Fresh Peak Plating' }
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
        <div className="hero-bg" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1920')` }}></div>
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
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200" alt="Mountain Restaurant Kitchen" className="story-img-main" />
            <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800" alt="Plated Dish" className="story-img-sub" />
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
          <span className="section-subtitle">Reserve Seating</span>
          <h2 className="section-title">The Dining Zones</h2>
          <p>Choose from three distinct dining layouts, each designed to evoke warmth, comfort, and premium alpine character.</p>
        </div>
        <div className="rooms-grid">
          {tables.map(table => (
            <div key={table.id} className="room-card hover-lift hover-scale">
              <div className="room-image-wrapper">
                <img src={table.image} alt={table.name} />
                <div className="room-price-badge">Premium Experience</div>
              </div>
              <div className="room-details">
                <h3>{table.name}</h3>
                <p style={{ fontSize: '14px', flexGrow: 1 }}>{table.description}</p>
                <div className="room-specs">
                  <span>Up to {table.capacity} Guests</span>
                </div>
                <div className="room-amenities">
                  {table.experience.map((exp, idx) => (
                    <span key={idx} className="amenity-tag">{exp}</span>
                  ))}
                </div>
                <button className="btn-card" onClick={() => selectZoneForBooking(table)}>
                  Select Zone
                </button>
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

        {/* Gastronomy Gallery - Scroll-driven Zoom Reveal & Marquee */}
        <div ref={culinarySectionRef} className={`zoom-reveal-section ${culinaryVisible ? 'visible' : ''}`}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', textAlign: 'center', marginBottom: '30px', color: 'var(--text-primary)' }}>
            Alpine Culinary & Food Plates
          </h3>
          <div className="marquee-container">
            <div className="marquee-content" style={{ animationDuration: '45s' }}>
              {foodImages.map((img, idx) => (
                <div key={`food-1-${idx}`} className="marquee-item-gallery">
                  <div className="room-image-wrapper" style={{ height: '300px', borderRadius: '8px', boxShadow: 'var(--shadow-floating)' }}>
                    <img src={img.url} alt={img.title} />
                  </div>
                  <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                    {img.title}
                  </p>
                </div>
              ))}
              {foodImages.map((img, idx) => (
                <div key={`food-2-${idx}`} className="marquee-item-gallery">
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
        </div>
      </section>

      {/* 4. Booking Form Section */}
      <section className="section section-bg-alt" id="reserve" ref={reservationSectionRef}>
        <div className="section-header">
          <span className="section-subtitle">Table Reservation</span>
          <h2 className="section-title">Secure Your Table</h2>
          <p>Reservations are highly recommended. Upon booking, the restaurant manager is notified immediately via SMS.</p>
        </div>

        <div className="booking-section-wrapper" style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-medium)' }}>
          {reserveSuccess ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--accent)' }}>
              <h3 style={{ fontSize: '28px', marginBottom: '15px' }}>Reservation Request Received</h3>
              <p style={{ color: 'var(--text-primary)' }}>Your alpine table reservation has been requested. The manager has been alerted via SMS.</p>
            </div>
          ) : (
            <form onSubmit={handleReservationSubmit}>
              <div className="form-group">
                <label>Dining Zone</label>
                <select 
                  value={reserveForm.tableId} 
                  onChange={(e) => {
                    const selected = tables.find(t => t.id === e.target.value);
                    setReserveForm(prev => ({ 
                      ...prev, 
                      tableId: e.target.value,
                      tableName: selected ? selected.name : ''
                    }));
                  }}
                >
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>{table.name} (Max {table.capacity} guests)</option>
                  ))}
                </select>
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Arthur Pendragon" 
                    value={reserveForm.guestName}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, guestName: e.target.value }))}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="E.g., arthur@camelot.com" 
                    value={reserveForm.guestEmail}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                    required 
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    value={reserveForm.date}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, date: e.target.value }))}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input 
                    type="time" 
                    value={reserveForm.time}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, time: e.target.value }))}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Guests Count</label>
                <select 
                  value={reserveForm.guestsCount} 
                  onChange={(e) => setReserveForm(prev => ({ ...prev, guestsCount: e.target.value }))}
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="5">5 Guests</option>
                  <option value="6">6 Guests</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Confirm Reservation
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 5. Horizontal Smooth Rotating Reviews Section (Right to Left Scrolling) */}
      <section className="section" id="reviews">
        <div className="section-header">
          <span className="section-subtitle">Testimonials</span>
          <h2 className="section-title">Verified Diners Reviews</h2>
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
              <span>Wednesday – Friday</span>
              <strong>16:00 – 23:00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <span>Saturday – Sunday</span>
              <strong>12:00 – 23:30</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', color: 'var(--text-secondary)' }}>
              <span>Monday – Tuesday</span>
              <span>Closed (Peak Maintenance)</span>
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
              <button 
                className="btn-primary" 
                style={{ width: '100%', background: 'transparent', borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  reservationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Reserve Table
              </button>
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
