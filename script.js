/* ===================================
   HOPE FOR IRAN — Interactive Scripts
   =================================== */

/* global convex */

(function () {
  'use strict';

  // --- Convex Client Setup ---
  var CONVEX_URL = window.__CONVEX_URL || 'https://tame-poodle-465.convex.cloud';
  var convexClient = null;

  function getConvexClient() {
    if (!convexClient && typeof convex !== 'undefined' && convex.ConvexHttpClient) {
      convexClient = new convex.ConvexHttpClient(CONVEX_URL);
    }
    return convexClient;
  }

  // --- Geometric Canvas Animation ---
  function initGeometricCanvas() {
    const canvas = document.getElementById('geometricCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    const shapes = [];
    const NUM_SHAPES = 30;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function createShape() {
      const types = ['hexagon', 'star', 'diamond', 'circle'];
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
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + rotation;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function drawStar(x, y, size, rotation) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i + rotation;
        const r = i % 2 === 0 ? size : size * 0.4;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
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

      // Draw connecting lines between nearby shapes
      for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
          var dx = shapes[i].x - shapes[j].x;
          var dy = shapes[i].y - shapes[j].y;
          var distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            ctx.beginPath();
            ctx.strokeStyle =
              'rgba(201, 149, 107, ' + (1 - distance / 200) * 0.15 + ')';
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
    for (let i = 0; i < NUM_SHAPES; i++) {
      shapes.push(createShape());
    }
    animate();

    window.addEventListener('resize', resize);
  }

  // --- Navbar Scroll ---
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (!navbar) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
        navToggle.classList.toggle('active');
      });

      // Close mobile nav when clicking a link
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.classList.remove('open');
          navToggle.classList.remove('active');
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
        if (num >= 1000000) {
          return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
          return Math.floor(num).toLocaleString();
        }
        return Math.floor(num).toLocaleString();
      }

      function update(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        var easedProgress = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(easedProgress * target);

        counter.textContent = formatNumber(current);

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
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Trigger progress bar
            var progressFill = entry.target.querySelector('.progress-fill');
            if (progressFill) {
              var targetWidth = progressFill.getAttribute('data-width');
              progressFill.style.width = targetWidth + '%';
            }

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      observer.observe(el);
    });

    // Observe hero for counter animation
    var hero = document.getElementById('hero');
    if (hero) {
      var heroObserver = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            animateCounters();
            heroObserver.unobserve(hero);
          }
        },
        { threshold: 0.3 }
      );
      heroObserver.observe(hero);
    }
  }

  // --- Donation Form ---
  function initDonationForm() {
    var form = document.getElementById('donateForm');
    if (!form) return;

    var selectedAmount = 75;
    var amountBtns = form.querySelectorAll('.amount-btn');
    var customInput = document.getElementById('customAmount');
    var submitBtn = document.getElementById('submitBtn');
    var freqBtns = form.querySelectorAll('.freq-btn');
    var dedicateCheckbox = document.getElementById('dedicateGift');
    var dedicationFields = document.getElementById('dedicationFields');

    function updateSubmitButton() {
      var frequency =
        form.querySelector('.freq-btn.active').getAttribute('data-freq') ===
        'monthly'
          ? '/mo'
          : '';
      submitBtn.querySelector('span').textContent =
        'Donate $' + selectedAmount + frequency + ' Now';
    }

    // Amount buttons
    amountBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        amountBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        selectedAmount = parseInt(btn.getAttribute('data-amount'), 10);
        customInput.value = '';
        updateSubmitButton();
      });
    });

    // Custom amount
    if (customInput) {
      customInput.addEventListener('input', function () {
        if (this.value) {
          amountBtns.forEach(function (b) {
            b.classList.remove('active');
          });
          selectedAmount = parseInt(this.value, 10) || 0;
          updateSubmitButton();
        }
      });

      customInput.addEventListener('focus', function () {
        amountBtns.forEach(function (b) {
          b.classList.remove('active');
        });
      });
    }

    // Frequency toggle
    freqBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        freqBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        updateSubmitButton();
      });
    });

    // Dedication toggle
    if (dedicateCheckbox && dedicationFields) {
      dedicateCheckbox.addEventListener('change', function () {
        dedicationFields.hidden = !this.checked;
      });
    }

    // Form submit — create Coinremitter LTC invoice via Convex
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (selectedAmount <= 0) {
        customInput.focus();
        return;
      }

      var firstName = document.getElementById('firstName').value || '';
      var lastName = document.getElementById('lastName').value || '';
      var email = document.getElementById('email').value || '';
      var frequency = form.querySelector('.freq-btn.active').getAttribute('data-freq') || 'once';
      var dedicateNameInput = document.getElementById('dedicateName');
      var dedicateName = (dedicateNameInput && dedicateNameInput.value) ? dedicateNameInput.value : undefined;

      var client = getConvexClient();
      if (!client) {
        alert('Payment service is not available. Please try again later.');
        return;
      }

      // Disable submit button while processing
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Processing…';

      var actionArgs = {
        amount: selectedAmount,
        firstName: firstName,
        lastName: lastName,
        email: email,
        frequency: frequency,
      };
      if (dedicateName) {
        actionArgs.dedicateName = dedicateName;
      }

      client.action('payments:createCoinremitterInvoice', actionArgs)
        .then(function (result) {
          // Store donation info locally
          localStorage.setItem('hasDonated', 'true');
          localStorage.setItem('donationAmount', selectedAmount);
          localStorage.setItem('donorName', firstName || 'Anonymous');

          // Unlock the comment section
          initCommentSection();

          // Redirect to Coinremitter invoice page for LTC payment
          if (result && result.invoiceUrl) {
            window.open(result.invoiceUrl, '_blank');
          }

          // Show thank you modal
          var modal = document.getElementById('thankYouModal');
          var modalAmount = document.getElementById('modalAmount');
          if (modal && modalAmount) {
            modalAmount.textContent = '$' + selectedAmount;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
          }
        })
        .catch(function (err) {
          console.error('Payment error:', err);
          alert('There was an error creating your payment. Please try again.');
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
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Share buttons
    modal.querySelectorAll('.share-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var platform = this.getAttribute('data-platform');
        var text =
          "I just donated to help families in Iran affected by conflict. Join me in making a difference!";
        var url = window.location.href;

        switch (platform) {
          case 'twitter':
            window.open(
              'https://twitter.com/intent/tweet?text=' +
                encodeURIComponent(text) +
                '&url=' +
                encodeURIComponent(url),
              '_blank'
            );
            break;
          case 'facebook':
            window.open(
              'https://www.facebook.com/sharer/sharer.php?u=' +
                encodeURIComponent(url),
              '_blank'
            );
            break;
          case 'copy':
            navigator.clipboard
              .writeText(url)
              .then(function () {
                btn.textContent = 'Link Copied!';
                setTimeout(function () {
                  btn.textContent = 'Copy Link';
                }, 2000);
              })
              .catch(function () {
                // Fallback
                btn.textContent = 'Copy Link';
              });
            break;
        }
      });
    });
  }

  // --- Comment Section (Donation-Gated) ---
  function initCommentSection() {
    var gateLocked = document.getElementById('gateLocked');
    var gateUnlocked = document.getElementById('gateUnlocked');
    var commentAmountInput = document.getElementById('commentAmount');
    var commentForm = document.getElementById('commentForm');
    var commentsList = document.getElementById('commentsList');

    if (!gateLocked || !gateUnlocked) return;

    var hasDonated = localStorage.getItem('hasDonated') === 'true';

    if (hasDonated) {
      gateLocked.hidden = true;
      gateUnlocked.hidden = false;

      // Pre-fill donation amount
      var amount = localStorage.getItem('donationAmount') || '75';
      if (commentAmountInput) {
        commentAmountInput.value = '$' + amount;
      }

      // Pre-fill name
      var nameInput = document.getElementById('commentName');
      var storedName = localStorage.getItem('donorName');
      if (nameInput && storedName) {
        nameInput.value = storedName;
      }
    } else {
      gateLocked.hidden = false;
      gateUnlocked.hidden = true;
    }

    // Load saved comments from localStorage
    loadSavedComments();

    // Handle comment form submission
    if (commentForm) {
      commentForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var nameInput = document.getElementById('commentName');
        var textInput = document.getElementById('commentText');
        var amountInput = document.getElementById('commentAmount');

        if (!nameInput.value.trim() || !textInput.value.trim()) return;

        var comment = {
          name: nameInput.value.trim(),
          text: textInput.value.trim(),
          amount: amountInput.value || '$75',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          id: Date.now()
        };

        // Save to localStorage
        var savedComments = JSON.parse(localStorage.getItem('userComments') || '[]');
        savedComments.unshift(comment);
        localStorage.setItem('userComments', JSON.stringify(savedComments));

        // Add to DOM
        addCommentToDOM(comment, true);

        // Reset form
        textInput.value = '';
      });
    }
  }

  function loadSavedComments() {
    var savedComments = JSON.parse(localStorage.getItem('userComments') || '[]');
    savedComments.forEach(function (comment) {
      addCommentToDOM(comment, false);
    });
  }

  function addCommentToDOM(comment, animate) {
    var commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    var colors = [
      'linear-gradient(135deg, #c9956b, #8b5e3c)',
      'linear-gradient(135deg, #2c6e8a, #1a3a5c)',
      'linear-gradient(135deg, #8fa587, #4a6741)',
      'linear-gradient(135deg, #b8734a, #8b5e3c)',
      'linear-gradient(135deg, #5b7fa5, #2c4a6e)'
    ];
    var randomColor = colors[Math.floor(Math.random() * colors.length)];
    var initial = comment.name.charAt(0).toUpperCase();

    var card = document.createElement('div');
    card.className = 'comment-card' + (animate ? ' new-comment' : '');
    card.innerHTML =
      '<div class="comment-avatar" style="background: ' + randomColor + ';">' + initial + '</div>' +
      '<div class="comment-body">' +
        '<div class="comment-header">' +
          '<strong>' + escapeHTML(comment.name) + '</strong>' +
          '<span class="comment-date">' + escapeHTML(comment.date) + '</span>' +
          '<span class="comment-badge">Donated ' + escapeHTML(comment.amount) + '</span>' +
        '</div>' +
        '<p>' + escapeHTML(comment.text) + '</p>' +
      '</div>';

    // Insert at the top of the comments list (after existing seeded comments if first load)
    if (animate) {
      commentsList.insertBefore(card, commentsList.firstChild);
    } else {
      commentsList.insertBefore(card, commentsList.firstChild);
    }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Initialize ---
  document.addEventListener('DOMContentLoaded', function () {
    initGeometricCanvas();
    initNavbar();
    initSmoothScroll();
    initScrollAnimations();
    initDonationForm();
    initModal();
    initCommentSection();
  });
})();
