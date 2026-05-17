document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            for (let i = 0; i < 20; i++) {
                createParticle(e.clientX, e.clientY);
            }
        });
    }

    function createParticle(x, y) {
        const particle = document.createElement('div');
        document.body.appendChild(particle);
        
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = '#ffc107';
        particle.style.position = 'fixed';
        particle.style.borderRadius = '50%';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';

        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity - 50;

        particle.animate([
            { transform: `translate(0, 0) scale(1)`, opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 400,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => particle.remove();
    }
});