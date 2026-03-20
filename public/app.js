/* ===================================
   HOPE FOR IRAN — Donation Hub App
   Firebase + Triple-A Integration
   =================================== */

(function () {
  'use strict';

  // --- Firebase Initialization ---
  // firebaseConfig is loaded from firebase-config.js (included before this script)
  var app = firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();

  var FUNDRAISING_GOAL = 2500000;

  // --- Real-Time Progress Bar (Firestore listener) ---
  function initRealtimeProgressBar() {
    var totalRaisedEl = document.getElementById('totalRaisedDisplay');
    var progressFillEl = document.getElementById('progressFill');
    var totalDonationsEl = document.getElementById('totalDonationsDisplay');
    var percentFundedEl = document.getElementById('percentFundedDisplay');

    if (!totalRaisedEl) return;

    // Listen to donations/stats document in real-time
    db.collection('donations').doc('stats')
      .onSnapshot(function (doc) {
        if (doc.exists) {
          var data = doc.data();
          var totalRaised = data.totalRaised || 0;
          var totalDonations = data.totalDonations || 0;
          var percent = Math.min((totalRaised / FUNDRAISING_GOAL) * 100, 100);

          totalRaisedEl.textContent = formatCurrency(totalRaised);
          totalDonationsEl.textContent = totalDonations.toLocaleString();
          percentFundedEl.textContent = percent.toFixed(1) + '% funded';
          progressFillEl.style.width = percent + '%';
        } else {
          // Document does not exist yet — show zeros
          totalRaisedEl.textContent = '0';
          totalDonationsEl.textContent = '0';
          percentFundedEl.textContent = '0% funded';
          progressFillEl.style.width = '0%';
        }
      }, function (error) {
        console.error('Error listening to donation stats:', error);
      });
  }

  function formatCurrency(amount) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + 'M';
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  // --- Geometric Canvas Animation ---
  function initGeometricCanvas() {
    var canvas = document.getElementById('geometricCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width, height;
    var shapes = [];
    var NUM_SHAPES = 30;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function createShape() {
      var types = ['hexagon', 'star', 'diamond', 'circle'];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 40 + 15,
        type: types[Math.floor(Math.random() * types.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.005,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      };
    }

    function drawHexagon(x, y, size, rotation) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var angle = (Math.PI / 3) * i + rotation;
        var px = x + size * Math.cos(angle);
        var py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function drawStar(x, y, size, rotation) {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var angle = (Math.PI / 4) * i + rotation;
        var r = i % 2 === 0 ? size : size * 0.4;
        var px = x + r * Math.cos(angle);
        var py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function drawDiamond(x, y, size, rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.restore();
    }

    function drawShape(shape) {
      ctx.strokeStyle = 'rgba(201, 149, 107, ' + shape.opacity + ')';
      ctx.lineWidth = 1;

      switch (shape.type) {
        case 'hexagon':
          drawHexagon(shape.x, shape.y, shape.size, shape.rotation);
          ctx.stroke();
          break;
        case 'star':
          drawStar(shape.x, shape.y, shape.size, shape.rotation);
          ctx.stroke();
          break;
        case 'diamond':
          drawDiamond(shape.x, shape.y, shape.size, shape.rotation);
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      shapes.forEach(function (shape) {
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;
        if (shape.x < -shape.size) shape.x = width + shape.size;
        if (shape.x > width + shape.size) shape.x = -shape.size;
        if (shape.y < -shape.size) shape.y = height + shape.size;
        if (shape.y > height + shape.size) shape.y = -shape.size;
        drawShape(shape);
      });

      for (var i = 0; i < shapes.length; i++) {
        for (var j = i + 1; j < shapes.length; j++) {
          var dx = shapes[i].x - shapes[j].x;
          var dy = shapes[i].y - shapes[j].y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 200) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(201, 149, 107, ' + (1 - distance / 200) * 0.15 + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(shapes[i].x, shapes[i].y);
            ctx.lineTo(shapes[j].x, shapes[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }

    resize();
    for (var i = 0; i < NUM_SHAPES; i++) {
      shapes.push(createShape());
    }
    animate();
    window.addEventListener('resize', resize);
  }

  // --- Navbar ---
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var navToggle = document.getElementById('navToggle');
    var mobileMenu = document.getElementById('mobileMenu');

    if (!navbar) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        navbar.classList.add('shadow-md', 'bg-cream/95');
      } else {
        navbar.classList.remove('shadow-md', 'bg-cream/95');
      }
    });

    if (navToggle && mobileMenu) {
      navToggle.addEventListener('click', function () {
        mobileMenu.classList.toggle('hidden');
      });

      mobileMenu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          mobileMenu.classList.add('hidden');
        });
      });
    }
  }

  // --- Smooth Scroll ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // --- Counter Animation ---
  function animateCounters() {
    var counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(function (counter) {
      var target = parseInt(counter.getAttribute('data-target'), 10);
      var duration = 2000;
      var startTime = null;

      function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        return Math.floor(num).toLocaleString();
      }

      function update(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var easedProgress = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatNumber(Math.floor(easedProgress * target));
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = formatNumber(target);
        }
      }

      requestAnimationFrame(update);
    });
  }

  // --- Scroll Animations ---
  function initScrollAnimations() {
    var hero = document.querySelector('header');
    if (hero) {
      var heroObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          animateCounters();
          heroObserver.unobserve(hero);
        }
      }, { threshold: 0.3 });
      heroObserver.observe(hero);
    }
  }

  // --- Donation Form (Crypto via Triple-A) ---
  function initDonationForm() {
    var form = document.getElementById('donateForm');
    if (!form) return;

    var selectedAmount = 75;
    var amountBtns = form.querySelectorAll('.amount-btn');
    var customInput = document.getElementById('customAmount');
    var submitBtn = document.getElementById('submitBtn');
    var freqBtns = form.querySelectorAll('.freq-btn');

    function updateSubmitButton() {
      var freqEl = form.querySelector('.freq-btn.active');
      var frequency = freqEl && freqEl.getAttribute('data-freq') === 'monthly' ? '/mo' : '';
      submitBtn.querySelector('span').textContent = 'Donate with Crypto — $' + selectedAmount + frequency;
    }

    amountBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        amountBtns.forEach(function (b) {
          b.classList.remove('active', 'border-gold', 'bg-gold/5');
          b.classList.add('border-gold/20');
        });
        btn.classList.add('active', 'border-gold', 'bg-gold/5');
        btn.classList.remove('border-gold/20');
        selectedAmount = parseInt(btn.getAttribute('data-amount'), 10);
        customInput.value = '';
        updateSubmitButton();
      });
    });

    if (customInput) {
      customInput.addEventListener('input', function () {
        if (this.value) {
          amountBtns.forEach(function (b) {
            b.classList.remove('active', 'border-gold', 'bg-gold/5');
            b.classList.add('border-gold/20');
          });
          selectedAmount = parseInt(this.value, 10) || 0;
          updateSubmitButton();
        }
      });
    }

    freqBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        freqBtns.forEach(function (b) {
          b.classList.remove('active', 'bg-gold', 'text-white', 'shadow-sm');
          b.classList.add('text-gray-500');
        });
        btn.classList.add('active', 'bg-gold', 'text-white', 'shadow-sm');
        btn.classList.remove('text-gray-500');
        updateSubmitButton();
      });
    });

    // Form submission — call Cloud Function to create invoice
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (selectedAmount <= 0) {
        customInput.focus();
        return;
      }

      var firstName = document.getElementById('firstName').value || 'Anonymous';
      var lastName = document.getElementById('lastName').value || '';
      var email = document.getElementById('email').value || '';

      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Creating secure payment...';

      fetch('/api/createDonationInvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedAmount,
          currency: 'USD',
          donorName: (firstName + ' ' + lastName).trim(),
          donorEmail: email,
        }),
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data.success && data.paymentUrl) {
            // Show thank you modal
            var modal = document.getElementById('thankYouModal');
            var modalAmount = document.getElementById('modalAmount');
            if (modal && modalAmount) {
              modalAmount.textContent = '$' + selectedAmount;
              modal.classList.remove('hidden');
              document.body.style.overflow = 'hidden';
            }

            // Redirect to payment page after a brief delay
            setTimeout(function () {
              window.open(data.paymentUrl, '_blank');
            }, 2000);
          } else {
            alert('Unable to create payment. Please try again.');
          }
        })
        .catch(function (error) {
          console.error('Error creating invoice:', error);
          alert('Something went wrong. Please try again.');
        })
        .finally(function () {
          submitBtn.disabled = false;
          updateSubmitButton();
        });
    });
  }

  // --- Modal ---
  function initModal() {
    var modal = document.getElementById('thankYouModal');
    var closeBtn = document.getElementById('modalClose');

    if (!modal) return;

    function closeModal() {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });

    modal.querySelectorAll('.share-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var platform = this.getAttribute('data-platform');
        var text = "I just donated to help families in Iran affected by conflict. Join me in making a difference!";
        var url = window.location.href;

        switch (platform) {
          case 'twitter':
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
            break;
          case 'facebook':
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
            break;
          case 'copy':
            navigator.clipboard.writeText(url).then(function () {
              btn.textContent = 'Copied!';
              setTimeout(function () { btn.textContent = 'Copy Link'; }, 2000);
            });
            break;
        }
      });
    });
  }

  // --- Fade-in animation on load ---
  function initFadeIn() {
    var items = document.querySelectorAll('.animate-fadeIn');
    items.forEach(function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease ' + (i * 0.15) + 's, transform 0.6s ease ' + (i * 0.15) + 's';
      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100);
    });
  }

  // --- Initialize Everything ---
  document.addEventListener('DOMContentLoaded', function () {
    initGeometricCanvas();
    initNavbar();
    initSmoothScroll();
    initScrollAnimations();
    initDonationForm();
    initModal();
    initRealtimeProgressBar();
    initFadeIn();
  });
})();
