// Add this code to cleanupOverlayElements() function
    
    // Make sure button containers have no gaps or borders
    $('.verbal-memory-left-btn, .verbal-memory-right-btn').css({
        'border': 'none',
        'border-left': 'none',
        'border-right': 'none',
        'width': '50%',
        'height': '100%',
        'padding': '0',
        'margin': '0'
    });
