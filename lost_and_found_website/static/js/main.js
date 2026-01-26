// Image preview functionality
function previewImages(input) {
    const previewContainer = document.getElementById('imagePreview');
    previewContainer.innerHTML = '';
    
    if (input.files.length > 5) {
        alert('You can only upload a maximum of 5 images.');
        input.value = '';
        return;
    }
    
    Array.from(input.files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            alert(`File "${file.name}" is not a valid image.`);
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'preview-container';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'image-preview';
            img.alt = `Preview ${index + 1}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.onclick = function() {
                previewDiv.remove();
            };
            
            previewDiv.appendChild(img);
            previewDiv.appendChild(removeBtn);
            previewContainer.appendChild(previewDiv);
        };
        
        reader.readAsDataURL(file);
    });
}

// Set max date to today for date inputs
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date_lost_found');
    if (dateInput) {
        const today = new Date().toISOString().split('T');
        dateInput.setAttribute('max', today);
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Search functionality
function performSearch() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.submit();
    }
}

// Auto-hide alerts
setTimeout(function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        if (alert.classList.contains('fade')) {
            alert.classList.remove('show');
        }
    });
}, 5000);
