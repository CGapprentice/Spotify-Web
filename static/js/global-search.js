// Global Search Enhancement
document.addEventListener('DOMContentLoaded', function() {
    const searchForms = document.querySelectorAll('form[action="/search"]');
    
    searchForms.forEach(form => {
        const input = form.querySelector('input[name="q"]');
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && this.value.trim()) {
                    e.preventDefault();
                    form.submit();
                }
            });

            input.addEventListener('focus', function() {
                this.parentElement.style.transform = 'scale(1.02)';
                this.parentElement.style.transition = 'transform 0.2s ease';
            });

            input.addEventListener('blur', function() {
                this.parentElement.style.transform = 'scale(1)';
            });
        }
    });
});