(function () {
    "use strict";

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finePointer = window.matchMedia("(pointer: fine)").matches;
    var progressBar = document.querySelector(".scroll-progress span");
    var zWorld = document.querySelector(".z-world");
    var zGrid = document.querySelector(".z-grid");
    var zCore = document.querySelector(".z-core");
    var zLayers = Array.prototype.slice.call(document.querySelectorAll("[data-z-layer]"));
    var depthSection = document.querySelector(".dimension-section");
    var depthCards = Array.prototype.slice.call(document.querySelectorAll("[data-depth-card]"));
    var canvas = document.querySelector(".ambient-canvas");
    var context = canvas && canvas.getContext("2d");
    var lenis = null;
    var lastScroll = -1;
    var viewport = { width: window.innerWidth, height: window.innerHeight };
    var pointer = {
        x: viewport.width * 0.7,
        y: viewport.height * 0.27,
        targetX: viewport.width * 0.7,
        targetY: viewport.height * 0.27
    };
    var dots = [];

    function clamp(value, minimum, maximum) {
        return Math.min(Math.max(value, minimum), maximum);
    }

    function setupAos() {
        document.querySelectorAll(".item_skill").forEach(function (card, index) {
            card.setAttribute("data-aos", "fade-up");
            card.setAttribute("data-aos-duration", "720");
            card.setAttribute("data-aos-delay", String(50 + index * 45));
        });

        if (window.AOS) {
            window.AOS.init({
                duration: 820,
                easing: "ease-out-cubic",
                offset: 55,
                once: true,
                disable: function () {
                    return reducedMotion.matches;
                }
            });
        }
    }

    function setupSmoothScroll() {
        if (!window.Lenis || reducedMotion.matches) {
            return;
        }

        lenis = new window.Lenis({
            anchors: true,
            autoRaf: false,
            lerp: 0.085,
            smoothWheel: true,
            wheelMultiplier: 0.92
        });
    }

    function updateProgress(scrollTop) {
        var documentHeight = document.documentElement.scrollHeight - viewport.height;
        var progress = documentHeight > 0 ? scrollTop / documentHeight : 0;

        if (progressBar) {
            progressBar.style.transform = "scaleX(" + clamp(progress, 0, 1) + ")";
        }
    }

    function updateZWorld(scrollTop) {
        if (!zWorld || reducedMotion.matches) {
            return;
        }

        var range = Math.max(document.documentElement.scrollHeight - viewport.height, 1);
        var pageProgress = clamp(scrollTop / range, 0, 1);
        var pulse = Math.sin(pageProgress * Math.PI * 10);

        if (zGrid) {
            zGrid.style.setProperty("--grid-shift", (pageProgress * 130) + "px");
        }

        if (zCore) {
            zCore.style.transform = "translate(-50%, -50%) scale(" + (1 + pageProgress * 0.4 + pulse * 0.03) + ")";
        }

        zLayers.forEach(function (layer, index) {
            var depth = Number(layer.getAttribute("data-z-layer")) || 0.4;
            var travel = pageProgress * 720 * depth;
            var rotation = pageProgress * (index % 2 ? -46 : 56) * depth;
            var scale = 1 + travel / 920;
            var offsetX = layer.classList.contains("shard") ? Math.sin(pageProgress * 12 + index) * 36 : 0;

            layer.style.transform = "translate(-50%, -50%) translate3d(" + offsetX + "px, 0, " + travel + "px) rotate(" + rotation + "deg) scale(" + scale + ")";
            layer.style.opacity = String(clamp(0.72 - pageProgress * depth * 0.42, 0.16, 0.78));
        });
    }

    function updateDepthCards() {
        if (!depthSection || !depthCards.length || reducedMotion.matches || viewport.width < 770) {
            return;
        }

        var rect = depthSection.getBoundingClientRect();
        var travel = Math.max(rect.height - viewport.height, 1);
        var localProgress = clamp(-rect.top / travel, 0, 1);

        depthCards.forEach(function (card, index) {
            var shiftZ = -150 + localProgress * 280 - index * 30;
            var shiftX = (localProgress - 0.5) * (index - 1) * 36;
            var rotation = (index - 1) * 2.3 * (1 - localProgress);

            card.style.transform = "translate3d(" + shiftX + "px, 0, " + shiftZ + "px) rotateY(" + rotation + "deg)";
            card.style.opacity = String(clamp(0.65 + localProgress * 0.42 - index * 0.04, 0.45, 1));
        });
    }

    function setupTilt() {
        if (reducedMotion.matches || !finePointer) {
            return;
        }

        document.querySelectorAll("[data-tilt]").forEach(function (card) {
            var frame = 0;
            var x = 0;
            var y = 0;

            function applyTilt() {
                var rotateX = (-y * 7).toFixed(2);
                var rotateY = (x * 7).toFixed(2);

                card.style.transform = "perspective(960px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-3px)";
                frame = 0;
            }

            card.addEventListener("pointerenter", function () {
                card.style.transitionDuration = ".24s";
            });

            card.addEventListener("pointermove", function (event) {
                var bounds = card.getBoundingClientRect();

                x = (event.clientX - bounds.left) / bounds.width - 0.5;
                y = (event.clientY - bounds.top) / bounds.height - 0.5;

                if (!frame) {
                    frame = window.requestAnimationFrame(applyTilt);
                }
            });

            card.addEventListener("pointerleave", function () {
                if (frame) {
                    window.cancelAnimationFrame(frame);
                    frame = 0;
                }
                card.style.removeProperty("transform");
            });
        });
    }

    function resizeCanvas() {
        if (!canvas || !context || reducedMotion.matches) {
            return;
        }

        var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        var dotCount = Math.min(Math.max(Math.floor(viewport.width / 28), 24), 52);

        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        dots = Array.from({ length: dotCount }, function () {
            return {
                x: Math.random() * viewport.width,
                y: Math.random() * viewport.height,
                radius: Math.random() * 1.7 + 0.55,
                dx: (Math.random() - 0.5) * 0.2,
                dy: (Math.random() - 0.5) * 0.2
            };
        });
    }

    function paintGlow(x, y, radius, color) {
        var gradient = context.createRadialGradient(x, y, 0, x, y, radius);

        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    function renderAmbientCanvas() {
        var index;
        var compareIndex;

        if (!canvas || !context || reducedMotion.matches) {
            return;
        }

        pointer.x += (pointer.targetX - pointer.x) * 0.045;
        pointer.y += (pointer.targetY - pointer.y) * 0.045;
        context.clearRect(0, 0, viewport.width, viewport.height);
        paintGlow(pointer.x, pointer.y, 350, "rgba(255,77,141,.13)");
        paintGlow(viewport.width * 0.18, viewport.height * 0.72, 380, "rgba(69,232,255,.105)");

        for (index = 0; index < dots.length; index += 1) {
            dots[index].x += dots[index].dx;
            dots[index].y += dots[index].dy;

            if (dots[index].x < -10 || dots[index].x > viewport.width + 10) {
                dots[index].dx *= -1;
            }
            if (dots[index].y < -10 || dots[index].y > viewport.height + 10) {
                dots[index].dy *= -1;
            }

            context.fillStyle = "rgba(69,232,255,.44)";
            context.beginPath();
            context.arc(dots[index].x, dots[index].y, dots[index].radius, 0, Math.PI * 2);
            context.fill();

            for (compareIndex = index + 1; compareIndex < dots.length; compareIndex += 1) {
                var distance = Math.hypot(dots[index].x - dots[compareIndex].x, dots[index].y - dots[compareIndex].y);

                if (distance < 104) {
                    context.strokeStyle = "rgba(125,92,255," + (0.12 * (1 - distance / 104)) + ")";
                    context.beginPath();
                    context.moveTo(dots[index].x, dots[index].y);
                    context.lineTo(dots[compareIndex].x, dots[compareIndex].y);
                    context.stroke();
                }
            }
        }
    }

    function resize() {
        viewport.width = window.innerWidth;
        viewport.height = window.innerHeight;
        resizeCanvas();
        lastScroll = -1;
    }

    function animate(time) {
        var scrollTop;

        if (lenis) {
            lenis.raf(time);
        }

        scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop !== lastScroll) {
            updateProgress(scrollTop);
            updateZWorld(scrollTop);
            updateDepthCards();
            lastScroll = scrollTop;
        }

        if (!document.hidden) {
            renderAmbientCanvas();
        }
        window.requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", function (event) {
        pointer.targetX = event.clientX;
        pointer.targetY = event.clientY;
    }, { passive: true });

    setupAos();
    setupSmoothScroll();
    setupTilt();
    resize();
    updateProgress(0);
    updateZWorld(0);
    updateDepthCards();
    window.requestAnimationFrame(animate);
}());
